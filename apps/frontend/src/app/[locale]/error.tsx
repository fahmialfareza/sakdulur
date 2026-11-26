"use client";

import { captureException } from "@/lib/sentry-client";
import { CloudOff, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useOffline } from "@/lib/offline";
import { reloadOnce } from "@/lib/reload-once";

// The page couldn't be loaded, most often because a new version went live while it was open or the server
// briefly answered 5xx: reloadOnce() retries by itself, without looping when the error is real.

export default function ErrorPage({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const to = useTranslations("offline");
  const { offline } = useOffline();
  useEffect(() => {
    console.error(error);
    captureException(error);
    // Offline a reload can't help (and would leave the saved copy for an error page).
    if (navigator.onLine) reloadOnce();
  }, [error]);
  if (offline) {
    return (
      <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <CloudOff className="size-12 text-muted-foreground" aria-hidden />
        <h1 className="font-display text-2xl font-semibold">{to("errorTitle")}</h1>
        <p className="max-w-md text-muted-foreground">{to("errorBody")}</p>
        <Button asChild variant="outline">
          <Link href="/app">{t("goHome")}</Link>
        </Button>
      </main>
    );
  }
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <TriangleAlert className="size-12 text-terracotta" aria-hidden />
      <h1 className="font-display text-2xl font-semibold">{t("errorTitle")}</h1>
      <p className="max-w-md text-muted-foreground">{t("errorBody")}</p>
      {error.digest ? <p className="font-mono text-xs text-muted-foreground">{error.digest}</p> : null}
      <div className="flex gap-2">
        {/* A full reload: reset() only re-renders, which can't recover a page whose data failed to load. */}
        <Button onClick={() => window.location.reload()}>
          <RotateCcw className="size-4" aria-hidden /> {t("retry")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/app">{t("goHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
