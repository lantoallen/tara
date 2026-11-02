"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api, errorMessage, unwrap } from "@/lib/api";
import { forgetSavedTickets } from "@/lib/offline-tickets";

type User = { id: string; name: string; email: string };
type Status = { kind: "ok" | "error"; text: string } | null;

function useAction() {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const run = (action: () => Promise<string | void>) => {
    setStatus(null);
    start(async () => {
      try {
        const text = await action();
        if (text) setStatus({ kind: "ok", text });
      } catch (err) {
        setStatus({ kind: "error", text: errorMessage(err) });
      }
    });
  };
  return { pending, status, run };
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.kind === "error" ? "alert" : "status"} className={`text-sm ${status.kind === "error" ? "text-bad" : "text-ok"}`}>
      {status.text}
    </p>
  );
}

export function AccountForms({ user }: { user: User }) {
  const router = useRouter();
  const profile = useAction();
  const password = useAction();
  const removal = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="font-medium">Profile</h2>
        <form
          className="mt-4 space-y-4"
          action={(form) =>
            profile.run(async () => {
              await unwrap(api.api.me.profile.$patch({ json: { name: String(form.get("name") ?? "") } }));
              router.refresh();
              return "Saved.";
            })
          }
        >
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required defaultValue={user.name} autoComplete="name" className="input" />
            <p className="mt-1 text-[13px] text-muted">Organizers see this on their attendee list and check-in screen.</p>
          </div>
          <div>
            <span className="label">Email</span>
            <p className="text-sm">{user.email}</p>
          </div>
          <StatusLine status={profile.status} />
          <button className="btn-secondary" disabled={profile.pending}>
            Save name
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="font-medium">Password</h2>
        <form
          className="mt-4 space-y-4"
          action={(form) =>
            password.run(async () => {
              const next = String(form.get("next") ?? "");
              if (next !== String(form.get("confirm") ?? "")) throw new Error("The two new passwords don't match.");
              await unwrap(
                api.api.me.password.$post({ json: { current: String(form.get("current") ?? ""), next } }),
              );
              return "Password changed. You've been signed out on your other devices.";
            })
          }
        >
          <div>
            <label className="label" htmlFor="current">
              Current password
            </label>
            <input id="current" name="current" type="password" autoComplete="current-password" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="next">
              New password
            </label>
            <input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="confirm">
              New password again
            </label>
            <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          <StatusLine status={password.status} />
          <button className="btn-secondary" disabled={password.pending}>
            Change password
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="font-medium">Delete account</h2>
        <p className="mt-1 text-sm text-muted">
          This removes your account and your tickets. Your spots go to the next people on each waitlist. It can&apos;t be
          undone.
        </p>
        {confirmDelete ? (
          <form
            className="mt-4 space-y-4"
            action={(form) =>
              removal.run(async () => {
                await unwrap(api.api.me.$delete({ json: { password: String(form.get("password") ?? "") } }));
                await forgetSavedTickets();
                router.push("/");
                router.refresh();
              })
            }
          >
            <div>
              <label className="label" htmlFor="delete-password">
                Your password, to confirm
              </label>
              <input id="delete-password" name="password" type="password" autoComplete="current-password" className="input" />
            </div>
            <StatusLine status={removal.status} />
            <div className="flex gap-2">
              <button className="btn-danger" disabled={removal.pending}>
                Delete my account
              </button>
              <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn-danger mt-4" onClick={() => setConfirmDelete(true)}>
            Delete account
          </button>
        )}
      </section>
    </div>
  );
}
