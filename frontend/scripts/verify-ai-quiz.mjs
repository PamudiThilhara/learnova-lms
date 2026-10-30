import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const base = process.argv[2] || "http://localhost:3011";
const directory = mkdtempSync(join(tmpdir(), "learnova-check-"));
const executable = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find(existsSync);
assert(executable, "Chrome or Edge is needed for browser verification. Set CHROME_PATH.");
const browser = spawn(executable, ["--headless=new", "--disable-gpu", "--disable-extensions", "--disable-background-networking", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${directory}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
let stderr = "";
browser.stderr.on("data", data => { stderr += data.toString(); });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, description, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await predicate()) return; await sleep(100); }
  throw new Error(`Timed out: ${description}`);
}
let socket;
let debug = async () => {};
const dialogs = [];
const checks = [];
try {
  await until(() => existsSync(join(directory, "DevToolsActivePort")), `starting browser: ${stderr}`, 15000);
  const port = readFileSync(join(directory, "DevToolsActivePort"), "utf8").split("\n")[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) { const item = pending.get(message.id); if (!item) return; pending.delete(message.id); if (message.error) item.reject(new Error(JSON.stringify(message.error))); else item.resolve(message.result); }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(message.params.args.map(a => a.description || a.value).join(" "));
    if (message.method === "Page.javascriptDialogOpening") { dialogs.push(message.params.message); void send("Page.handleJavaScriptDialog", { accept: true }); }
  });
  socket.addEventListener("close", () => { for (const item of pending.values()) item.reject(new Error("Browser connection closed: " + stderr.slice(-2000))); pending.clear(); });
  function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; const timeout = setTimeout(() => { pending.delete(id); reject(new Error("Browser command timed out: " + method)); }, 20000); pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } }); socket.send(JSON.stringify({ id, method, params })); }); }
  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  debug = async () => {
    writeFileSync(join(directory, 'failure.json'), JSON.stringify({ dialogs, url: await evaluate('location.href'), body: await evaluate('document.body.innerText'), errors }, null, 2));
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(directory, 'failure.png'), Buffer.from(shot.data, 'base64'));
  };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  async function navigate(path, expectedError = false) {
    errors.length = 0;
    await send("Page.navigate", { url: base + path });
    await until(() => evaluate(`document.readyState === "complete" && !!document.querySelector("h1,h2") && !document.querySelector('[aria-label="Loading Learnova"]')`), path, 30000);
    await sleep(120);
    if (!expectedError) assert.equal(errors.length, 0, `Browser errors at ${path}: ${errors.join("\n")}`);
  }
  async function click(text) {
    const result = await evaluate(`(() => { const element = [...document.querySelectorAll("button")].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!element) return false; element.click(); return true; })()`);
    assert(result, `Button not found: ${text}`); await sleep(100);
  }
  async function fill(label, value) {
    const result = await evaluate(`(() => { const element = [...document.querySelectorAll("label")].find(el => el.textContent.trim().startsWith(${JSON.stringify(label)}))?.control; if (!element) return false; const proto = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : element.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event("input", { bubbles: true })); element.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
    assert(result, `Field not found: ${label}`); await sleep(60);
  }
  const apiBase = process.env.LEARNOVA_TEST_API || 'http://localhost:4011/api';
  const data = () => evaluate(`fetch(${JSON.stringify(apiBase + '/state')}, { credentials: 'include' }).then(r => r.json())`);
  const testerEmail = 'browser-' + Date.now() + '@learnova.test';
  const testPassword = 'Browser-test-only-42';
  async function signIn(email) { await navigate('/login'); await fill('Email', email); await fill('Password', testPassword); await click('Login'); await until(() => evaluate("location.pathname.endsWith('-dashboard')"), 'login redirect'); }


  const check = name => { checks.push(name); console.log('PASS '+name); };
  const { lecturePdf } = await import('../../backend/test/helpers/lecture-pdf.js');
  const { mkdirSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const fixtureDirectory = resolve('../.runtime/verification'); mkdirSync(fixtureDirectory,{recursive:true});
  const pdfPath=join(fixtureDirectory,'ai-lecture.pdf'); writeFileSync(pdfPath,lecturePdf());
  await navigate('/register');
  await fill('Full Name','PDF Quiz Browser Tester'); await fill('Email','pdf-'+Date.now()+'@learnova.test');
  await fill('Password',testPassword); await fill('Confirm Password',testPassword);
  await evaluate("document.querySelector('input[type=checkbox]').click()"); await click('Create Account');
  await until(()=>evaluate("location.pathname==='/student-dashboard'"),'student registration');
  await navigate('/student-dashboard/ai-quizzes');
  await send('DOM.enable'); const root=await send('DOM.getDocument');
  const input=await send('DOM.querySelector',{nodeId:root.root.nodeId,selector:'input[type=file]'});
  await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[pdfPath]});
  await until(()=>evaluate("!document.querySelector('button[type=submit]') || [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Continue to configuration')&&!b.disabled)"),'PDF selection');
  await click('Continue to configuration');
  await until(()=>evaluate("location.pathname.includes('/documents/') && document.body.textContent.includes('extracted characters')"),'PDF extraction');
  const documentRoute=await evaluate('location.pathname');
  check('Real searchable PDF uploaded and extracted through the UI');
  await click('5 questions'); await click('5 minutes');
  await evaluate("document.querySelector('main input[type=checkbox]').click()");
  await click('Generate my quiz');
  await until(()=>evaluate("location.pathname.includes('/quizzes/') && document.body.textContent.includes('Start Quiz')"),'test-provider generation');
  const readyRoute=await evaluate('location.pathname');
  check('Quiz configuration, loading state, and generation flow work with the isolated test provider');
  await click('Start Quiz');
  await until(()=>evaluate("!!document.querySelector('[role=timer]')"),'timed quiz');
  const attemptRoute=await evaluate('location.pathname');const attemptId=attemptRoute.split('/').at(-1);
  const getAttempt=()=>evaluate('fetch('+JSON.stringify(apiBase+'/ai-quizzes/attempts/'+attemptId)+', {credentials:"include"}).then(r=>r.json())');
  const original=await getAttempt();assert(original.questions.every(q=>q.answer===undefined&&q.explanation===undefined));
  await evaluate("document.querySelectorAll('main input[type=radio]')[0].click()");
  await until(async()=> (await getAttempt()).attempt.answers[0]===0,'first answer saved');
  await click('Next');await evaluate("document.querySelectorAll('main input[type=radio]')[2].click()");
  await until(async()=> (await getAttempt()).attempt.answers[1]===2,'second answer saved');
  await click('Previous');assert(await evaluate("document.querySelectorAll('main input[type=radio]')[0].checked"));
  await send('Page.reload');await until(()=>evaluate("!!document.querySelector('[role=timer]') && !!document.querySelector('main input[type=radio]')"),'quiz refresh');
  const refreshed=await getAttempt();assert.equal(refreshed.attempt.deadline,original.attempt.deadline);assert.deepEqual(refreshed.attempt.answers,[0,2,null,null,null]);
  check('Answers persist across navigation and refresh; original backend deadline and hidden answer key are preserved');
  await until(()=>evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Submit quiz'&&!b.disabled)"),'submission enabled');
  await click('Submit quiz');await until(()=>evaluate("location.pathname.endsWith('/results') && document.body.textContent.includes('20%')"),'manual results');
  const resultsRoute=await evaluate('location.pathname');
  assert(await evaluate("document.body.textContent.includes('Your answer') && document.body.textContent.includes('From your notes')"));
  check('Manual submission saves the server score and exposes explanations only after submission');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for (const route of ['/student-dashboard/ai-quizzes',documentRoute,readyRoute,resultsRoute,'/student-dashboard/ai-quizzes/history']) {
    await navigate(route);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Mobile overflow '+route);
  }
  await evaluate("document.querySelector('button[aria-controls=workspace-navigation]').click()");
  assert(await evaluate("document.querySelector('#workspace-navigation').getBoundingClientRect().height>0"));
  const mobileShot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(fixtureDirectory,'ai-mobile.png'),Buffer.from(mobileShot.data,'base64'));
  check('AI upload, configuration, ready, results, history, and collapsible navigation fit a mobile screen');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate(readyRoute);await click('Start Quiz');await until(()=>evaluate("!!document.querySelector('[role=timer]')"),'retake');
  const autoRoute=await evaluate('location.pathname');assert.notEqual(autoRoute,attemptRoute);
  await evaluate("document.querySelectorAll('main input[type=radio]')[0].click()");
  await until(()=>evaluate("document.body.textContent.includes('All answers saved')"),'retake answer saved');
  const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(fixtureDirectory,'ai-timed-quiz.png'),Buffer.from(shot.data,'base64'));
  console.log('Waiting for the actual five-minute countdown and automatic submission?');
  await until(()=>evaluate("location.pathname.endsWith('/results') && document.body.textContent.includes('saved answers were submitted automatically')"),'five-minute automatic submission',330000);
  check('A real five-minute countdown automatically submits saved answers and records a timed-out result');
  await navigate('/student-dashboard/ai-quizzes/history');assert(await evaluate("document.body.textContent.includes('Completed') && document.body.textContent.includes('20%')"));
  check('Quiz history shows persisted manual and timed-out results');
  console.log(JSON.stringify({checks:checks.length,artifacts:fixtureDirectory,provider:'isolated test double; real Gemini not tested'},null,2));
} catch(error) {
  await debug().catch(()=>{});console.error(error);console.error('Browser artifacts: '+directory);process.exitCode=1;
} finally {
  if(socket){try{socket.send(JSON.stringify({id:999999,method:'Browser.close'}));}catch{}socket.close();}browser.kill();
}
