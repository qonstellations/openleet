export interface PageStatus {
  supported: boolean;
  slug?: string;
}

export function detectPageStatus(url: URL): PageStatus {
  if (url.protocol !== "https:" || url.hostname !== "leetcode.com") {
    return { supported: false };
  }
  const match = url.pathname.match(/^\/problems\/([^/]+)(?:\/|$)/);
  if (!match?.[1]) return { supported: false };
  return { supported: true, slug: match[1] };
}
