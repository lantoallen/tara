import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFields, AuthForm } from "@/components/auth-form";
import { DEMO_MODE } from "@/lib/config";

export const metadata: Metadata = { title: "Sign up" };

export default function Page() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      {DEMO_MODE && (
        <p className="mt-1 text-sm text-muted">
          Accounts are wiped when the demo resets each day, so don&apos;t reuse a real password.
        </p>
      )}
      <Suspense fallback={<AuthFields mode="signup" demo={DEMO_MODE} next={null} />}>
        <AuthForm mode="signup" demo={DEMO_MODE} />
      </Suspense>
    </div>
  );
}
