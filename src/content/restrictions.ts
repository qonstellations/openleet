export interface PageStatus {
  supported: boolean;
  restricted: boolean;
  slug?: string;
  reason?: string;
}

const RESTRICTED_PATHS = [
  /\/contest(?:\/|$)/i, /\/assessment(?:\/|$)/i, /\/interview(?:\/|$)/i,
  /\/exam(?:\/|$)/i, /\/test(?:\/|$)/i
];
const RESTRICTED_TEXT = /\b(weekly contest|biweekly contest|assessment|interview simulation|online assessment|exam mode|proctored)\b/i;

export function detectPageStatus(url: URL, bodyText = ""): PageStatus {
  if (RESTRICTED_PATHS.some((pattern) => pattern.test(url.pathname))) {
    return { supported: false, restricted: true, reason: "OpenLeet is disabled during contests, assessments, interviews, and restricted testing environments." };
  }
  const match = url.pathname.match(/^\/problems\/([^/]+)(?:\/|$)/);
  if (!match?.[1]) return { supported: false, restricted: false };
  if (RESTRICTED_TEXT.test(bodyText.slice(0, 5_000))) {
    return { supported: false, restricted: true, slug: match[1], reason: "This page appears to be a restricted assessment or contest environment. OpenLeet analysis is disabled." };
  }
  return { supported: true, restricted: false, slug: match[1] };
}
