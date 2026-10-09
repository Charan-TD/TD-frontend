/**
 * "Remember me" on the sign-in form keeps the employee's email in a cookie so
 * the form is pre-filled next time. Only the email is stored, never the
 * password.
 */
const COOKIE_NAME = "train_dabba_remembered_email";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const secureFlag = () =>
  typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";

export function getRememberedEmail(): string {
  if (typeof document === "undefined") return "";

  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : "";
}

export function saveRememberedEmail(email: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(email)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureFlag()}`;
}

export function clearRememberedEmail() {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secureFlag()}`;
}
