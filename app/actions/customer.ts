"use server";

import { redirect } from "next/navigation";

import { setCustomerCookie } from "@/lib/customer";
import { getDbState } from "@/lib/db";
import { SQL } from "@/lib/sql/queries";

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

  const row = state.db.prepare(SQL.customerById).get(id) as
    | { customer_id: number }
    | undefined;
  if (!row) {
    redirect(`/select-customer?error=unknown`);
  }

  await setCustomerCookie(id);
  redirect("/dashboard");
}
