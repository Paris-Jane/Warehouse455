"use server";

import { redirect } from "next/navigation";

import { clearCustomerCookie } from "@/lib/customer";

export async function clearCustomerSession() {
  await clearCustomerCookie();
  redirect("/select-customer");
}
