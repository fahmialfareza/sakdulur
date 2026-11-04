// The website build (vite.config.ts, mode "web") keeps apps/frontend's lib/native.ts; pages/auth.tsx also names
// the apps' sign-in binding key, which the site never uses (its Worker keeps the binding in a cookie).
export * from "@frontend/lib/native";

export const BINDING_KEY = "sakdulur-oauth-binding";
