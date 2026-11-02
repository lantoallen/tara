"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { api } from "@/lib/api";
import { forgetSavedTickets } from "@/lib/offline-tickets";

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm border border-white/25 text-hero-ink hover:bg-white/10"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await api.api.auth.logout.$post();
          await forgetSavedTickets();
          router.push("/");
          router.refresh();
        })
      }
    >
      Log out
    </button>
  );
}
