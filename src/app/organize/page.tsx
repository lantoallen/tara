import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageBand } from "@/components/page-band";
import { EventStatusBadge } from "@/components/organizer/event-status";
import { load, serverApi } from "@/lib/server-api";
import { formatTime, formatWeekdayDate } from "@/lib/time";

export const metadata: Metadata = { title: "Organize" };

export default function OrganizePage() {
  return (
    <>
      <PageBand title="Your events">
        <Link href="/organize/new" className="btn bg-hero-ink text-hero hover:opacity-90">
          New event
        </Link>
      </PageBand>
      <Suspense fallback={<div data-loading className="card h-64 animate-pulse" />}>
        <EventList />
      </Suspense>
    </>
  );
}

async function EventList() {
  const client = await serverApi();
  const { events } = await load(client.api.organizer.events.$get(), { returnTo: "/organize" });

  if (events.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium">You haven&apos;t made any events yet.</p>
        <p className="mt-1 text-sm text-muted">
          Create one and it shows up here with its sign-ups, waitlist, and check-ins. Or log in as the sample
          organizer to see one that&apos;s already busy.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[13px] text-muted">
            <th className="px-4 py-2.5 font-medium">Event</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Going</th>
            <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Waitlist</th>
            <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Checked in</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {events.map((e) => (
            <tr key={e.id} className="hover:bg-surface-2">
              <td className="px-4 py-3">
                <Link href={`/organize/${e.id}`} className="font-medium hover:underline">
                  {e.title}
                </Link>
                <div className="text-[13px] text-muted">
                  {formatWeekdayDate(e.startsAt)}, {formatTime(e.startsAt)} · {e.city}
                </div>
              </td>
              <td className="px-4 py-3">
                <EventStatusBadge status={e.status} endsAt={e.endsAt} />
                {e.visibility === "unlisted" && <span className="text-[13px] text-muted"> (unlisted)</span>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {e.confirmed}
                <span className="text-muted">/{e.capacity}</span>
              </td>
              <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{e.waitlisted || "–"}</td>
              <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{e.checkedIn || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
