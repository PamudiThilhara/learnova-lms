"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';

type Playback = { provider: 'youtube'; embedUrl: string; watchUrl: string };
export default function LessonVideoPlayer({ courseId, lessonId, title, allowed }: { courseId: string; lessonId: string; title: string; allowed: boolean }) {
  const [result, setResult] = useState<{ video?: Playback; error?: string }>({});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    void api<{ video: Playback }>(`/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/video`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResult({ video: data.video }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ error: errorMessage(error) }); });
    return () => controller.abort();
  }, [courseId, lessonId, allowed, retry]);
  if (!allowed) return <section className="notice mt-7"><h2 className="font-semibold">Lesson Video</h2><p className="mt-2">Enroll in this course to watch the lesson video.</p><Link className="mt-3 inline-block font-semibold text-blue-300" href={`/courses/${courseId}`}>View course enrollment</Link></section>;
  if (result.error) return <section className="notice mt-7" role="alert"><p>{result.error}</p><button type="button" className="btn-secondary mt-3" onClick={() => { setResult({}); setRetry(value => value + 1); }}>Try again</button></section>;
  if (!result.video) return <p className="notice mt-7" role="status">Loading lesson video...</p>;
  return <section className="mt-7" aria-label="Lesson Video"><h2 className="mb-4 text-xl font-bold">Lesson Video</h2>
    <iframe title={`Lesson video: ${title}`} src={result.video.embedUrl} className="aspect-video min-h-[200px] w-full rounded-xl border border-white/10 bg-slate-950" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    <p className="mt-3 text-xs leading-6 text-slate-400">If this video cannot be embedded, <a href={result.video.watchUrl} target="_blank" rel="noopener" className="font-semibold text-blue-300 underline">watch it on YouTube</a>.</p>
  </section>;
}
