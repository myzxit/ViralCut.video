/**
 * URL helpers shared by the landing hero, the create form, and the API route.
 * Kept dependency-free so it runs unchanged on the client and in the worker.
 */

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

const SUPPORTED_HOSTS = new Set([
  ...YOUTUBE_HOSTS,
  'vimeo.com',
  'www.vimeo.com',
]);

export function parseUrl(input: string): URL | null {
  try {
    // Accept `youtube.com/...` without a scheme the way a paste from the address bar looks.
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(withScheme);
  } catch {
    return null;
  }
}

export function isLikelyVideoUrl(input: string): boolean {
  const url = parseUrl(input);
  if (!url) return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (SUPPORTED_HOSTS.has(url.hostname)) return true;
  // Allow a direct link to a video file on any host.
  return /\.(mp4|mov|m4v|webm|mkv)$/i.test(url.pathname);
}

/** Returns the 11-character YouTube id, or null for any other URL. */
export function youtubeVideoId(input: string): string | null {
  const url = parseUrl(input);
  if (!url || !YOUTUBE_HOSTS.has(url.hostname)) return null;

  const id =
    url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : url.pathname.startsWith('/shorts/')
        ? url.pathname.split('/')[2]
        : url.searchParams.get('v');

  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function youtubeThumbnail(input: string): string | null {
  const id = youtubeVideoId(input);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
