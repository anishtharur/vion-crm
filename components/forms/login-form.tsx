"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { login } from "@/lib/actions/auth";
import { initialFormState } from "@/lib/validation/schemas";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
        />
      </div>
      <div>
        <Label htmlFor="password" required>
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
