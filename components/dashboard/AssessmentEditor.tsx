"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";
import { useLearnova } from "@/components/LearnovaProvider";
import { EmptyState, LoadingCards, PageHeader } from "@/components/ui";
import type { Course } from "@/data/courses";
import { assignmentFor, quizFor } from "@/data/learning";
export default function AssessmentEditor({ mode }: { mode: "quiz" | "assignment" }) {
  const { id } = useParams<{ id: string }>(); const { state } = useLearnova(); const course = state.courses.find(c => c.id === id);
  if (!state.ready) return <LoadingCards />;
  if (!course) return <EmptyState title="Course not found" description="Choose a course from your workspace." href="/instructor-dashboard/courses" action="My Courses" />;
  return <Editor key={`${id}-${mode}`} course={course} mode={mode} />;
}
function Editor({ course, mode }: { course: Course; mode: "quiz" | "assignment" }) {
  const { dispatch } = useLearnova(); const router = useRouter(); const assignment = assignmentFor(course);
  const [questions, setQuestions] = useState(quizFor(course));
  const [title, setTitle] = useState(assignment.title); const [instructions, setInstructions] = useState(assignment.instructions); const [due, setDue] = useState(assignment.due); const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "quiz" && (!questions.length || questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()) || !q.explanation.trim()))) { setError("Complete every question, its four options, and its explanation."); return; }
    if (mode === "assignment" && (title.trim().length < 3 || instructions.trim().length < 20 || !due)) { setError("Add a title, instructions (20+ characters), and a deadline."); return; }
    if (!(await dispatch({ type: "save-course", course: mode === "quiz" ? { ...course, quiz: questions } : { ...course, assignment: { title: title.trim(), instructions: instructions.trim(), due } } })).ok) return; router.push(`/instructor-dashboard/${mode === "quiz" ? "quizzes" : "assignments"}`);
  }
  return <><PageHeader title={mode === "quiz" ? "Edit Quiz" : "Edit Assignment"} description={course.title} /><form className="space-y-5" onSubmit={submit} noValidate>{mode === "assignment" ? <div className="panel space-y-5 p-6"><label className="block"><span className="field-label">Assignment title</span><input className="field" value={title} onChange={e => setTitle(e.target.value)} /></label><label className="block"><span className="field-label">Instructions</span><textarea className="field min-h-48" value={instructions} onChange={e => setInstructions(e.target.value)} /></label><label className="block"><span className="field-label">Deadline</span><input className="field" type="date" value={due} onChange={e => setDue(e.target.value)} /></label></div> : <>{questions.map((question, index) => <fieldset key={index} className="panel p-6"><legend className="px-3 font-bold">Question {index + 1}</legend><label className="block"><span className="field-label">Question</span><input className="field" value={question.question} onChange={e => setQuestions(questions.map((q, i) => i === index ? { ...q, question: e.target.value } : q))} /></label><div className="mt-4 grid gap-4 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex}><span className="field-label">Option {optionIndex + 1}</span><input className="field" value={option} onChange={e => setQuestions(questions.map((q, i) => i === index ? { ...q, options: q.options.map((o, j) => j === optionIndex ? e.target.value : o) } : q))} /></label>)}</div><label className="mt-4 block"><span className="field-label">Correct answer</span><select className="field" value={question.answer} onChange={e => setQuestions(questions.map((q, i) => i === index ? { ...q, answer: Number(e.target.value) } : q))}>{question.options.map((_, i) => <option key={i} value={i}>Option {i + 1}</option>)}</select></label><label className="mt-4 block"><span className="field-label">Answer explanation</span><textarea className="field" value={question.explanation} onChange={e => setQuestions(questions.map((q, i) => i === index ? { ...q, explanation: e.target.value } : q))} /></label><button className="mt-4 inline-flex items-center gap-2 text-sm text-red-500" type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== index))}><Trash2 size={15} />Remove Question</button></fieldset>)}<button className="btn-secondary" type="button" onClick={() => setQuestions([...questions, { question: "", options: ["", "", "", ""], answer: 0, explanation: "" }])}><Plus size={16} />Add Question</button></>}{error && <p className="form-error" role="alert">{error}</p>}<div className="flex gap-3"><button className="btn-primary"><Save size={16} />Save {mode === "quiz" ? "Quiz" : "Assignment"}</button><Link className="btn-secondary" href={`/instructor-dashboard/${mode === "quiz" ? "quizzes" : "assignments"}`}>Cancel</Link></div></form></>;
}
