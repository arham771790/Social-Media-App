// app/(auth)/reset-password/page.jsx
export const dynamic = "force-dynamic";      // prevent static prerender
export const revalidate = 0;                  // belt & suspenders (no caching)

import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  );
}
