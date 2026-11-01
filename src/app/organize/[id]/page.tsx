import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendeesTable } from "@/components/organizer/attendees-table";
import { EventActions } from "@/components/organizer/event-actions";
import { EventStatusBadge } from "@/components/organizer/event-status";
import { Column, FullBleed } from "@/components/full-bleed";
import { MessagePanel } from "@/components/organizer/message-panel";
import { SignupChart } from "@/components/organizer/signup-chart";
import { load, serverApi } from "@/lib/server-api";
import { formatFullDate, formatTimeRange } from "@/lib/time";

export const metadata: Metadata = { title: "Manage event" };

export default function ManageEventPage({ params }: PageProps<"/organize/[id]">) {
  return (
    <Suspense
      fallback={
        <div data-loading>
          <FullBleed className="photo photo-band -mt-8 h-70" />
        </div>
      }
    >
      <Dashboard params={params} />
    </Suspense>
  );
}

async function Dashboard({ params }: { params: PageProps<"/organize/[id]">["params"] }) {
  const { id } = await params;
  const client = await serverApi();
  const route = client.api.organizer.events[":id"];
  const returnTo = `/organize/${id}`;
  const [{ event }, { stats }, { attendees }, { messages }] = await Promise.all([
    load(route.$get({ param: { id } }), { returnTo }),
    load(route.stats.$get({ param: { id } }), { returnTo }),
    load(route.attendees.$get({ param: { id } }), { returnTo }),
    load(route.announcements.$get({ param: { id } }), { returnTo }),
  ]);
  const ended = new Date(event.endsAt) <= new Date();

  return (
    <div className="space-y-6">
      {/* The same green banner as the event page; the stats strip overlaps its edge. */}
      <FullBleed className="photo photo-band -mt-8 text-hero-ink [--veil-right:78%]">
        <Column className="pt-4 pb-20">
          <Link href="/organize" className="text-sm text-hero-muted hover:text-hero-ink">
            ← Your events
          </Link>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-balance">{event.title}</h1>
              <p className="mt-1 text-sm text-hero-muted">
                <EventStatusBadge status={event.status} endsAt={event.endsAt} onDark />
                {event.visibility === "unlisted" && " (unlisted)"} · {formatFullDate(event.startsAt)},{" "}
                {formatTimeRange(event.startsAt, event.endsAt)} · {event.isOnline ? "Online" : `${event.location}, ${event.city}`}
              </p>
            </div>
            <EventActions eventId={event.id} slug={event.slug} status={event.status} ended={ended} />
          </div>
        </Column>
      </FullBleed>

      {/* One strip with hairline dividers: the gap shows the border color behind the cells. */}
      <dl className="relative -mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-[0_20px_40px_-24px_rgba(0,0,0,0.35)] md:grid-cols-4">
        <Stat label="Going" value={stats.confirmed} suffix={`/ ${stats.capacity}`} />
        <Stat
          label="Checked in"
          value={stats.checkedIn}
          suffix={stats.checkedIn ? `${Math.round(stats.checkInRate * 100)}%` : undefined}
        />
        <Stat label="Waitlist" value={stats.waitlisted} />
        <Stat label="Cancelled" value={stats.cancelled} />
      </dl>

      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Sign-ups per day</h2>
          <span className="text-[13px] text-muted tabular-nums">
            {stats.daily.reduce((n, d) => n + d.count, 0)} total
          </span>
        </div>
        <SignupChart daily={stats.daily} />
      </section>

      {event.status !== "draft" && <MessagePanel eventId={event.id} messages={messages} waitlisted={stats.waitlisted} />}

      <section>
        <AttendeesTable eventId={event.id} attendees={attendees} />
      </section>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-2xl font-semibold tabular-nums">
        {value}
        {suffix && <span className="ml-1.5 text-sm font-normal text-muted">{suffix}</span>}
      </dd>
    </div>
  );
}
