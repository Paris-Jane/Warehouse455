"use client";

import { useTransition } from "react";

import { clearCustomerSession } from "@/app/actions/session";

type Props = {
  label?: string;
};

export function ClearSessionButton({ label = "Clear session" }: Props) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="button"
      disabled={pending}
      onClick={() => start(() => clearCustomerSession())}
    >
      {pending ? "…" : label}
    </button>
  );
}
