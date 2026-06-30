"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-destructive">
        <TriangleAlert className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="font-display text-lg font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button className="mt-5" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
