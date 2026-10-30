import type { LessonVideo } from '@/data/courses';

export function youtubeReference(value: string): LessonVideo | null {
  if (value.length > 2048) return null;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  let id: string | null | undefined;
  if (url.hostname === 'youtu.be') id = /^\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) id = url.searchParams.get('v');
    else id = /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1];
  } else if (['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) id = /^\/embed\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1];
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: 'youtube', videoId: id } : null;
}

export const youtubeUrl = (video?: LessonVideo | null) => video ? `https://www.youtube.com/watch?v=${video.videoId}` : '';
