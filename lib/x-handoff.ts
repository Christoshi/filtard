export const X_HANDOFF_COOKIE = "filtard_x_handoff";
export const X_HANDOFF_MARKER = "filtard_x_pending";
export const X_HANDOFF_TTL_SECONDS = 10 * 60;
export const X_HANDOFF_EVENT = "filtard-x-handoff";
export const X_HANDOFF_POLL_MS = 2500;

const HANDOFF_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isHandoffId(value: string | null | undefined): value is string {
  return typeof value === "string" && HANDOFF_ID_RE.test(value);
}
