export function isResponseCurrent(
  requestId: string,
  activeRequestId: string | undefined,
  responseFingerprint: string | undefined,
  currentFingerprint: string,
  responseSlug: string,
  currentSlug: string
): boolean {
  return requestId === activeRequestId &&
    Boolean(responseFingerprint) &&
    responseFingerprint === currentFingerprint &&
    responseSlug === currentSlug;
}
