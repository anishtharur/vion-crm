"use server";

import { redirect } from "next/navigation";

import { createSession, deleteSession } from "@/lib/auth/session";
import { authenticate, getUsers } from "@/lib/auth/users";
import type { FormState } from "@/lib/validation/schemas";

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Enter your email and password." };
  }
  if (getUsers().length === 0) {
    return {
      ok: false,
      message:
        "No users are configured. Set the AUTH_USERS environment variable (see .env.example).",
    };
  }

  const user = await authenticate(email, password);
  if (!user) {
    return { ok: false, message: "Invalid email or password." };
  }

  await createSession(user);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
