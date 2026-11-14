/**
 * Resolve a YouTube embed URL from a video title.
 * Used when Pressbooks EPUB strips iframes and only leaves the title on a stub link.
 */

const cache = new Map<string, string | null>();

function firstVideoId(html: string): string | null {
  const m = /"videoId":"([A-Za-z0-9_-]{11})"/.exec(html);
  return m?.[1] ?? null;
}

/** In-process cache so one book doesn’t re-query the same title. */
export function clearYoutubeTitleCache(): void {
  cache.clear();
}

/**
 * Search YouTube by title and return an embed URL for the top result.
 * Returns null on network/parse failure (caller keeps a watch card).
 */
export async function resolveYoutubeEmbedByTitle(
  title: string,
): Promise<string | null> {
  const trimmed = title.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 8) return null;

  const key = trimmed.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SOL-Books/1.0; +https://sol.app)',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html',
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const html = await res.text();
    const id = firstVideoId(html);
    const embed = id ? `https://www.youtube.com/embed/${id}` : null;
    cache.set(key, embed);
    return embed;
  } catch {
    cache.set(key, null);
    return null;
  }
}
