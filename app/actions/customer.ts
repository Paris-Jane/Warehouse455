"use server";

import { redirect } from "next/navigation";

import { setCustomerCookie } from "@/lib/customer";
import { dbCustomerById } from "@/lib/db-access";
import { getDbState } from "@/lib/db";

export async function selectCustomerAction(formData: FormData) {
  const state = getDbState();
  if (!state.ok) {
    redirect(`/select-customer?error=db`);
  }

  const raw = formData.get("customer_id");
  const id = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    redirect(`/select-customer?error=invalid`);
  }

  const row = await dbCustomerById(state, id);
  if (!row) {
    redirect(`/select-customer?error=unknown`);
  }

  await setCustomerCookie(id);
  redirect("/dashboard");
}
