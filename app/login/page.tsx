import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { getSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  const settings = getSettings();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground">
            V
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Vion<span className="text-primary"> CRM</span>
          </span>
          <p className="text-sm text-muted-foreground">
            Sign in to {settings.companyName}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
