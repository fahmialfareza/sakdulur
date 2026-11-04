import { CLIENT_COOKIE, isAppClient } from "@/lib/app-client";
import { SIGNED_IN_COOKIE } from "@/lib/session-hint";

// The website build's session check (vite.config.ts, mode "web"): the tokens are in httpOnly cookies the page
// cannot read; the readable hint next to them says whether there is a session (lib/session-hint.ts). A stale hint
// is cleared by the Worker on the first refused API call, which then goes to the sign-in page.

function cookie(name: string) {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];
}

export const hasSession = () => !!cookie(SIGNED_IN_COOKIE);

/** Where signed-out visitors go: the sign-in page, or the welcome screen in the old app shells (?client=). */
export function signInPath(next: string) {
  const path = isAppClient(cookie(CLIENT_COOKIE)) ? "/welcome" : "/auth/login";
  return `${path}?next=${encodeURIComponent(next)}`;
}
