"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminPassword, createSessionToken, safeEqual, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function login(_: { error: string } | null, formData: FormData): Promise<{ error: string } | null> {
  const expected = adminPassword();
  if (!expected) return { error: "서버에 ADMIN_PASSWORD가 설정되지 않았습니다." };
  const password = String(formData.get("password") ?? "");
  if (!safeEqual(password, expected)) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: "비밀번호가 올바르지 않습니다." };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  const next = String(formData.get("next") ?? "/admin");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
