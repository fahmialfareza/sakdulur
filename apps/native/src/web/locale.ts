import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

// The website build's language (vite.config.ts, mode "web"): the cookie the Worker and the language switcher set
// (apps/frontend i18n/config.ts), else the browser's language.
export const LOCALE_KEY = "sakdulur-locale";

export function currentLocale(): Locale {
  const saved = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`))?.[1];
  if (isLocale(saved)) return saved;
  return /^(id|in)\b/i.test(navigator.language) ? "id" : "en";
}
