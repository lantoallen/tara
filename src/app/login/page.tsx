import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { DEMO_MODE } from "@/lib/config";

export const metadata: Metadata = { title: "Log in" };

export default function Page() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <AuthForm mode="login" demo={DEMO_MODE} />
    </div>
  );
}
