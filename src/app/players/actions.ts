"use server";

import { redirect } from "next/navigation";
import { normalizeAccessCode } from "@/lib/ids";

export async function openByCode(formData: FormData): Promise<void> {
  const code = normalizeAccessCode(String(formData.get("code") ?? ""));
  if (!code) redirect("/players?error=1");
  redirect(`/r/${encodeURIComponent(code)}`);
}
