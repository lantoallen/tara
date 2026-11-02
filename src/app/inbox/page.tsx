import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBand } from "@/components/page-band";
import { Badge } from "@/components/badges";
import { DEMO_MODE } from "@/lib/config";
import { load, serverApi } from "@/lib/server-api";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <>
      <PageBand title="Inbox" />
      <p className="max-w-2xl text-sm text-muted">
        A copy of every email we&apos;ve sent you: confirmations, waitlist updates, reminders, and messages from
        organizers.{DEMO_MODE && " On this demo they only land here, not in a real inbox."}
      </p>
      <Suspense fallback={<div data-loading className="card mt-6 h-48 animate-pulse" />}>
        <Emails />
      </Suspense>
    </>
  );
}

async function Emails() {
  const client = await serverApi();
  const { emails } = await load(client.api.me.inbox.$get(), { returnTo: "/inbox" });
  if (emails.length === 0) {
    return <p className="card mt-6 p-8 text-center text-sm text-muted">Nothing yet. Register for an event and the confirmation shows up here.</p>;
  }
  return (
    <ul className="card mt-6 divide-y divide-line">
      {emails.map((email) => (
        <li key={email.id}>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <span className="min-w-0 flex-1 truncate font-medium">{email.subject}</span>
              {email.status === "failed" && <Badge tone="bad">Not delivered</Badge>}
              <span className="shrink-0 text-[13px] text-muted">{formatDateTime(email.createdAt)}</span>
            </summary>
            <div className="px-4 pt-1 pb-5 text-sm leading-relaxed whitespace-pre-line text-ink/90">{email.body}</div>
          </details>
        </li>
      ))}
    </ul>
  );
}
