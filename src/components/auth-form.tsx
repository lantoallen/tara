"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { api, errorMessage, unwrap } from "@/lib/api";
import { safeRedirectPath } from "@/lib/safe-redirect";


type Props = { mode: "login" | "signup"; demo: boolean };

export function AuthForm(props: Props) {
  // Only ever send people back to a page on this site.
  return <AuthFields {...props} next={safeRedirectPath(useSearchParams().get("next"))} />;
}

// The form itself. Pages also show it, without `next`, while the address is
// being read, so it's on screen from the start instead of popping in.
export function AuthFields({ mode, demo, next }: Props & { next: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function finish(fallback: string) {
    router.push(next ?? fallback);
    router.refresh();
  }

  function submit(form: FormData) {
    setError(null);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    start(async () => {
      try {
        if (mode === "signup") {
          await unwrap(api.api.auth.signup.$post({ json: { name: String(form.get("name") ?? ""), email, password } }));
        } else {
          await unwrap(api.api.auth.login.$post({ json: { email, password } }));
        }
        finish("/events");
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }

  function signInAsSample(as: "attendee" | "organizer") {
    setError(null);
    start(async () => {
      try {
        await unwrap(api.api.auth.demo.$post({ json: { as } }));
        finish(as === "organizer" ? "/organize" : "/tickets");
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }

  const other = mode === "login" ? "/signup" : "/login";
  const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;

  return (
    <>
      <form action={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required autoComplete="name" className="input" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="input"
          />
          {mode === "signup" && <p className="mt-1 text-[13px] text-muted">At least 8 characters.</p>}
          {mode === "login" && (
            <Link href="/forgot-password" className="mt-1 inline-block text-[13px] text-muted hover:text-ink">
              Forgot your password?
            </Link>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={pending}>
          {mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link href={otherHref} className="link">
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>

      {demo && (
      <div className="card mt-8 p-4">
        <p className="text-sm font-medium">Just looking around?</p>
        <p className="mt-1 text-[13px] text-muted">
          Sign in as one of the sample accounts. Sam has tickets in every state, and Batangas Builders runs a few
          events you can check people in to.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-secondary flex-1" disabled={pending} onClick={() => signInAsSample("attendee")}>
            Try as Sam (attendee)
          </button>
          <button type="button" className="btn-secondary flex-1" disabled={pending} onClick={() => signInAsSample("organizer")}>
            Try as an organizer
          </button>
        </div>
      </div>
      )}
    </>
  );
}
