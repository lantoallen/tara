import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckInDesk } from "@/components/organizer/check-in-desk";
import { load, serverApi } from "@/lib/server-api";
import { formatTimeRange, formatWeekdayDate } from "@/lib/time";

export const metadata: Metadata = { title: "Check-in" };

export default function CheckInPage({ params }: PageProps<"/organize/[id]/check-in">) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<div data-loading className="card h-[560px] animate-pulse" />}>
        <Desk params={params} />
      </Suspense>
    </div>
  );
}

async function Desk({ params }: { params: PageProps<"/organize/[id]/check-in">["params"] }) {
  const { id } = await params;
  const client = await serverApi();
  const route = client.api.organizer.events[":id"];
  const returnTo = `/organize/${id}/check-in`;
  const [{ event }, { stats }, { recent }] = await Promise.all([
    load(route.$get({ param: { id } }), { returnTo }),
    load(route.stats.$get({ param: { id } }), { returnTo }),
    load(route["check-ins"].$get({ param: { id } }), { returnTo }),
  ]);
  return (
    <>
      <Link href={`/organize/${id}`} className="text-sm text-muted hover:text-ink">
        ← Back to the dashboard
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">{event.title}</h1>
      <p className="text-sm text-muted">
        {formatWeekdayDate(event.startsAt)}, {formatTimeRange(event.startsAt, event.endsAt)}
      </p>
      <CheckInDesk
        eventId={event.id}
        initial={{ checkedIn: stats.checkedIn, confirmed: stats.confirmed }}
        initialRecent={recent}
      />
    </>
  );
}
