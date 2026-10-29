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

  const check = name => { checks.push(name); console.log("PASS " + name); };
  const routes = ["/", "/courses", "/courses/1", "/login", "/register", "/student-dashboard", "/student-dashboard/courses", "/student-dashboard/assignments", "/student-dashboard/quizzes", "/student-dashboard/progress", "/student-dashboard/certificates", "/instructor-dashboard", "/instructor-dashboard/courses", "/instructor-dashboard/courses/create", "/admin-dashboard", "/admin-dashboard/users", "/profile", "/about", "/contact", "/courses/1/quiz", "/courses/1/assignment", "/courses/1/certificate", "/courses/1/learn", "/courses/1/lessons/1", "/instructor-dashboard/students", "/instructor-dashboard/assignments", "/instructor-dashboard/quizzes", "/instructor-dashboard/courses/1/edit", "/instructor-dashboard/courses/1/quiz", "/instructor-dashboard/courses/1/assignment", "/admin-dashboard/courses", "/admin-dashboard/students", "/admin-dashboard/instructors", "/admin-dashboard/reports", "/admin-dashboard/settings", "/admin-dashboard/users/student-1", "/terms", "/privacy", "/forgot-password"];
  for (const route of routes.filter(r => !r.startsWith('/student-dashboard') && !r.startsWith('/instructor-dashboard') && !r.startsWith('/admin-dashboard') && r !== '/profile' && !r.startsWith('/courses/1/'))) { await navigate(route); assert(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'Desktop overflow: ' + route); }
  for (const [email, prefix] of [['student@learnova.demo', '/student-dashboard'], ['instructor@learnova.demo', '/instructor-dashboard'], ['admin@learnova.demo', '/admin-dashboard']]) {
    await signIn(email);
    for (const route of routes.filter(r => r.startsWith(prefix))) { await navigate(route); assert(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'Desktop overflow: ' + route); }
  }
  await evaluate(`fetch(${JSON.stringify(apiBase + '/auth/logout')}, { method: 'POST', credentials: 'include', headers: { 'X-Learnova-Request': '1' } })`);
  check(`${routes.length} routes render without browser errors or desktop overflow`);
  await navigate("/courses/4");
  assert(await evaluate("document.querySelector('h1').textContent.includes('Python Advanced')"));
  await until(() => evaluate("[...document.images].every(img => img.complete && img.naturalWidth > 0)"), "course images");
  check("Course IDs and image assets resolve correctly");
  await navigate("/courses?category=Design");
  assert.equal(await evaluate("document.querySelectorAll('article').length"), 3);
  await navigate("/courses?q=React");
  assert.equal(await evaluate("document.querySelectorAll('article').length"), 1);
  check("URL search and category filters work");
  await navigate("/courses/not-a-course", true);
  assert(await evaluate("document.querySelector('h1').textContent.includes('study break')"));
  await navigate("/does-not-exist", true);
  assert(await evaluate("document.querySelector('h1').textContent.includes('study break')"));
  check("Unknown routes and courses show the 404 view");

  await navigate("/register");
  await click("Create Account");
  assert(await evaluate("document.querySelectorAll('.form-error').length >= 4"));
  await fill("Full Name", "Frontend Tester"); await fill("Email", testerEmail);
  await fill("Password", testPassword); await fill("Confirm Password", testPassword);
  await evaluate("document.querySelector('input[type=checkbox]').click()");
  await click("Create Account");
  await until(() => evaluate("location.pathname === '/student-dashboard'"), "registration redirect");
  let saved = await data();
  const tester = saved.users.find(u => u.email === testerEmail);
  assert(tester); assert(!JSON.stringify(saved).includes(testPassword));
  assert(await evaluate('!localStorage.getItem("learnova.frontend.v1") && !document.cookie.includes("learnova_session")')); check("Registration validates input; passwords and session tokens stay out of browser storage");
  await navigate("/courses/1"); await click("Enroll Now");
  await until(async () => !!(await data()).learning[tester.id]?.enrollments["1"], "enrollment");
  for (let i = 1; i <= 10; i++) { await navigate(`/courses/1/lessons/${i}`); await click("Mark as Complete"); await until(async () => (await data()).learning[tester.id].enrollments["1"].completed.includes(String(i)), "lesson save"); }
  saved = await data(); assert.equal(saved.learning[tester.id].enrollments["1"].completed.length, 10);
  check("Enrollment and ten lesson completions persist");
  await navigate("/courses/1/learn"); await navigate("/courses/1/certificate");
  await navigate("/courses/1/quiz");
  const correctAnswers = [0, 0, 2, 1, 2, 1, 0, 2, 1, 0];
  for (let i = 0; i < 10; i++) {
    await evaluate(`document.querySelectorAll('input[type=radio]')[${correctAnswers[i]}].click()`);
    await click(i === 9 ? "Submit Quiz" : "Next");
  }
  await until(() => evaluate("document.body.textContent.includes('100%')"), "quiz result");
  saved = await data(); assert.equal(saved.learning[tester.id].quizzes["1"].score, 100);
  check("Interactive quiz displays the server-verified score");
  await navigate("/courses/1/assignment"); await fill("Your reflection", "I built a Python learning tracker with functions, dictionaries, input validation, and clear progress reporting."); await click("Submit Assignment");
  await until(async () => !!(await data()).learning[tester.id].submissions["1"], "assignment submission");
  await navigate("/courses/1/certificate");
  assert(await evaluate("document.querySelector('.certificate').textContent.includes('Frontend Tester')"));
  const pdf = await send("Page.printToPDF", { landscape: true, printBackground: true, preferCSSPageSize: true });
  writeFileSync(join(directory, "certificate.pdf"), Buffer.from(pdf.data, "base64"));
  assert(Buffer.from(pdf.data, "base64").length > 1000);
  check("Assignment unlocks a printable completion certificate");
  await navigate("/profile"); await click("Edit Profile"); await fill("Full Name", "Frontend Tester Updated"); await click("Save Changes");
  await until(async () => (await data()).users.some(u => u.name === "Frontend Tester Updated"), "profile save"); await navigate("/profile"); assert(await evaluate("document.body.textContent.includes('Frontend Tester Updated')"));
  check("Profile editing persists after navigation");
  await signIn("instructor@learnova.demo");
  await until(() => evaluate("location.pathname === '/instructor-dashboard'"), "instructor login");
  await navigate("/instructor-dashboard/courses/create");
  await fill("Course Title", "Browser Check Course"); await fill("Description", "A practical course created during browser verification of the Learnova frontend.");
  await fill("Learning Outcomes", "Build a clear plan\nReview evidence");
  await click("Create Course"); await until(() => evaluate("location.pathname === '/instructor-dashboard/courses'"), "course creation");
  saved = await data(); const created = saved.courses.find(c => c.title === "Browser Check Course"); assert(created);
  await navigate(`/instructor-dashboard/courses/${created.id}/edit`); await fill("Course Title", "Browser Check Course Updated"); await click("Save Changes");
  await until(async () => (await data()).courses.find(c => c.id === created.id)?.title === "Browser Check Course Updated", "course edit");
  await navigate(`/instructor-dashboard/courses/${created.id}/assignment`); await fill("Assignment title", "Practical verification project"); await click("Save Assignment");
  await until(async () => (await data()).courses.find(c => c.id === created.id)?.assignment?.title === "Practical verification project", "assignment edit");
  await navigate(`/instructor-dashboard/courses/${created.id}/quiz`); await click("Add Question"); await fill("Question", "What is the purpose of a variable?"); for (let i = 1; i <= 4; i++) await fill("Option " + i, "Option " + i); await fill("Answer explanation", "A variable gives a name to a value."); await click("Save Quiz");
  await until(async () => (await data()).courses.find(c => c.id === created.id)?.quiz?.[0].question === "What is the purpose of a variable?", "quiz edit");
  check("Instructor can create and edit courses, assignments, and quizzes");
  await navigate("/instructor-dashboard/assignments"); await click("Grade Submission"); await fill("Marks", "92"); await fill("Feedback", "Clear structure and thoughtful implementation."); await click("Save Grade");
  await until(async () => (await data()).learning[tester.id].submissions["1"].marks === 92, "grading");
  check("Instructor grading updates the student's submission");
  await signIn("admin@learnova.demo"); await until(() => evaluate("location.pathname === '/admin-dashboard'"), "admin login");
  await navigate("/admin-dashboard/users");
  await evaluate(`(() => { const row = [...document.querySelectorAll('tbody tr')].find(row => row.textContent.includes(${JSON.stringify(testerEmail)})); [...row.querySelectorAll('button')].find(button => button.textContent === 'Block').click(); })()`);
  await until(async () => (await data()).users.find(u => u.id === tester.id)?.status === "Blocked", "blocking user");
  check("Admin can block an account");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const route of ["/", "/courses", "/courses/1", "/student-dashboard", "/instructor-dashboard/courses", "/admin-dashboard/users", "/profile", "/register", "/contact"]) {
    if (route.startsWith('/student-dashboard') || route === '/profile') await signIn('student@learnova.demo');
    if (route.startsWith('/instructor-dashboard')) await signIn('instructor@learnova.demo');
    if (route.startsWith('/admin-dashboard')) await signIn('admin@learnova.demo');
    await navigate(route); assert(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), `Mobile overflow: ${route}`);
  }
  await navigate("/");
  await evaluate("document.querySelector('button[aria-controls=mobile-nav]').click()");
  assert(await evaluate("!!document.querySelector('#mobile-nav')"));
  const mobileImage = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(directory, "mobile-home.png"), Buffer.from(mobileImage.data, "base64"));
  check("Mobile layouts and hamburger navigation work");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("/");
  const desktopImage = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(directory, "desktop-home.png"), Buffer.from(desktopImage.data, "base64"));
  console.log(JSON.stringify({ checks: checks.length, artifacts: directory }, null, 2));
} catch (error) {
  await debug().catch(() => {});
  console.error(error);
  console.error("Browser artifacts: " + directory);
  if (stderr) console.error(stderr.slice(-3000));
  process.exitCode = 1;
} finally {
  if (socket) { try { socket.send(JSON.stringify({ id: 999999, method: "Browser.close" })); } catch {} socket.close(); }
  browser.kill();
}
