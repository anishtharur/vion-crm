import Link from "next/link";

import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <p className="font-display text-5xl font-semibold text-primary">404</p>
      <h1 className="mt-3 font-display text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you’re looking for doesn’t exist or was moved.
      </p>
      <Link href="/" className={`${buttonClass("primary", "md")} mt-6`}>
        Back to dashboard
      </Link>
    </div>
  );
}
