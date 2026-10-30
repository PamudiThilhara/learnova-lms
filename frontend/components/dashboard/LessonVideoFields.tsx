"use client";
import { Film, Trash2 } from 'lucide-react';
import { youtubeReference } from '@/lib/lesson-video';

export default function LessonVideoFields({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const invalid = Boolean(value.trim()) && !youtubeReference(value);
  return <section className="sm:col-span-2 rounded-xl border border-white/10 bg-blue-500/5 p-4" aria-label="Lesson Video">
    <h3 className="mb-4 flex items-center gap-2 font-semibold"><Film size={18} className="text-violet-300" />Lesson Video</h3>
    <label className="block"><span className="field-label">YouTube video URL (optional)</span><input type="url" className="field" value={value} maxLength={2048} disabled={disabled} aria-invalid={invalid} placeholder="https://www.youtube.com/watch?v=..." onChange={event => onChange(event.target.value)} /></label>
    {invalid && <p className="form-error">Enter a valid HTTPS YouTube watch, share, Shorts, live, or embed URL.</p>}
    <p className="mt-2 text-xs leading-6 text-slate-400">Use a video that allows embedding. Replacing or removing its URL takes effect when you save the course.</p>
    {value.trim() && <button type="button" className="btn-secondary mt-3" disabled={disabled} onClick={() => onChange('')}><Trash2 size={15} />Remove Video</button>}
    <label className="mt-5 block"><span className="field-label">Upload MP4 / WebM</span><input type="file" accept=".mp4,.webm,video/mp4,video/webm" disabled className="max-w-full text-sm text-slate-400 disabled:cursor-not-allowed disabled:opacity-60" /></label>
    <p className="mt-2 text-xs leading-6 text-slate-400">Direct uploads are unavailable. Use a YouTube URL for now.</p>
  </section>;
}
