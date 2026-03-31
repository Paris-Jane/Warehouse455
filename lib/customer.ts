import "server-only";

import { cookies } from "next/headers";

import { dbCustomerById } from "@/lib/db-access";
import type { DbReady } from "@/lib/db";

export const CUSTOMER_COOKIE = "customer_id";

export type CustomerRow = {
  customer_id: number;
  full_name: string;
  email: string;
};

export async function getCookieCustomerId(): Promise<number | null> {
  const jar = await cookies();
  const raw = jar.get(CUSTOMER_COOKIE)?.value;
  if (raw == null || raw.trim() === "") return null;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function getSelectedCustomer(
  ready: DbReady
): Promise<
  | { status: "none" }
  | { status: "invalid_cookie" }
  | { status: "ok"; customer: CustomerRow }
> {
  const id = await getCookieCustomerId();
  if (id == null) return { status: "none" };

  const customer = await dbCustomerById(ready, id);
  if (!customer) return { status: "invalid_cookie" };

  return { status: "ok", customer };
}

export async function setCustomerCookie(customerId: number) {
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, String(customerId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearCustomerCookie() {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
}
