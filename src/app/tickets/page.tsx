import type { InferResponseType } from "hono/client";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TicketBadge } from "@/components/badges";
import type { api } from "@/lib/api";
import { load, serverApi } from "@/lib/server-api";
import { formatDay, formatMonth, formatShortDate, formatTime, formatWeekdayDate } from "@/lib/time";
import { CATEGORY_COLOR } from "@/lib/categories";
import { PageBand } from "@/components/page-band";

export const metadata: Metadata = { title: "My tickets" };

export default function TicketsPage() {
  return (
    <>
      <PageBand title="My tickets" />
      <Suspense fallback={<div data-loading className="card mt-6 h-48 animate-pulse" />}>
        <TicketList />
      </Suspense>
    </>
  );
}

async function TicketList() {
  const client = await serverApi();
  const { tickets } = await load(client.api.me.tickets.$get(), { returnTo: "/tickets" });
  const now = new Date();
  const upcoming = tickets
    .filter((t) => new Date(t.event.endsAt) > now && t.event.status !== "cancelled")
    .sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
  const past = tickets.filter((t) => !upcoming.includes(t));

  if (tickets.length === 0) {
    return (
      <div className="card mt-6 p-8 text-center">
        <p className="font-medium">No tickets yet.</p>
        <p className="mt-1 text-sm text-muted">
          <Link href="/events" className="link">
            Find something to go to
          </Link>{" "}
          and your tickets will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      <TicketGroup title="Coming up" tickets={upcoming} empty="Nothing coming up." />
      {past.length > 0 && <TicketGroup title="Past and cancelled" tickets={past} />}
    </div>
  );
}

type Ticket = InferResponseType<typeof api.api.me.tickets.$get, 200>["tickets"][number];

function TicketGroup({ title, tickets, empty }: { title: string; tickets: Ticket[]; empty?: string }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {tickets.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {tickets.map((t) => (
            <li key={t.ticketCode}>
              <TicketStub ticket={t} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// A paper ticket: the date on a stub, a tear line with notches, then the event.
function TicketStub({ ticket: t }: { ticket: Ticket }) {
  const done = new Date(t.event.endsAt) <= new Date() || t.event.status === "cancelled";
  return (
    <Link
      href={t.status === "confirmed" ? `/tickets/${t.ticketCode}` : `/events/${t.event.slug}`}
      className={`group lift flex h-full overflow-hidden rounded-xl border border-line bg-surface hover:border-line-strong ${done ? "opacity-75" : ""}`}
    >
      <div
        className="flex w-20 shrink-0 flex-col items-center justify-center border-l-4 py-4 text-center"
        style={{ borderLeftColor: CATEGORY_COLOR[t.event.category] }}
      >
        <span className="text-[11px] font-semibold tracking-wider text-muted">{formatMonth(t.event.startsAt)}</span>
        <span className="text-2xl leading-tight font-semibold">{formatDay(t.event.startsAt)}</span>
        <span className="text-xs text-muted">{formatTime(t.event.startsAt)}</span>
      </div>
      <div className="relative border-l-2 border-dashed border-line" aria-hidden="true">
        <span className="absolute -top-3 -left-[13px] h-6 w-6 rounded-full border border-line bg-bg" />
        <span className="absolute -bottom-3 -left-[13px] h-6 w-6 rounded-full border border-line bg-bg" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <p className="leading-snug font-semibold group-hover:underline group-hover:underline-offset-2">{t.event.title}</p>
          <p className="mt-1 text-[13px] text-muted">
            {formatWeekdayDate(t.event.startsAt)} · {t.event.isOnline ? "Online" : t.event.city}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <TicketBadge
            status={t.status}
            checkedInAt={t.checkedInAt}
            waitlistPosition={t.waitlistPosition}
            eventStatus={t.event.status}
          />
          {t.checkedInAt && <span className="text-muted">{formatShortDate(t.checkedInAt)}, {formatTime(t.checkedInAt)}</span>}
          {t.status === "confirmed" && !done && (
            <span className="text-muted group-hover:text-ink">
              Show ticket <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
