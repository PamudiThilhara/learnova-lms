const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const embedHosts = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com']);

// Parse locally: never fetch an instructor-supplied URL or accept arbitrary iframe HTML.
export function youtubeReference(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  let url;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  let id;
  if (url.hostname === 'youtu.be') id = /^\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1];
  else if (youtubeHosts.has(url.hostname)) {
    if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) id = url.searchParams.get('v');
    else id = /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1];
  } else if (embedHosts.has(url.hostname)) id = /^\/embed\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1];
  return id && videoIdPattern.test(id) ? { provider: 'youtube', videoId: id } : null;
}

export function youtubePlayback(video) {
  if (video?.provider !== 'youtube' || !videoIdPattern.test(video.videoId ?? '')) return null;
  return {
    provider: 'youtube',
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0`,
    watchUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
  };
}
