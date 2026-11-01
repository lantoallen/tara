import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CapacityMeter } from "@/components/capacity-meter";
import { Countdown } from "@/components/countdown";
import { EventCard } from "@/components/event-card";
import { RegisterPanel } from "@/components/register-panel";
import { ShareButton } from "@/components/share-button";
import { CategoryLabel } from "@/components/category-label";
import { Column, FullBleed } from "@/components/full-bleed";
import { CATEGORY_COLOR } from "@/lib/categories";
import { mapsUrl } from "@/lib/maps";
import { currentUser, load, serverApi } from "@/lib/server-api";
import {
  formatDay,
  formatFullDate,
  formatMonth,
  formatTime,
  formatTimeRange,
  formatWeekday,
  formatWeekdayDate,
  startsIn,
} from "@/lib/time";
import type { EventCategory } from "@/server/db/schema";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const client = await serverApi();
  const res = await client.api.events[":slug"].$get({ param: { slug } });
  if (!res.ok) return { title: "Event not found" };
  const { event } = await res.json();
  return { title: event.title, description: event.summary };
}

export default function EventPage({ params }: PageProps<"/events/[slug]">) {
  return (
    <Suspense
      fallback={
        <div data-loading>
          <FullBleed className="photo photo-band -mt-8 h-70 md:h-78" />
        </div>
      }
    >
      <EventDetail params={params} />
    </Suspense>
  );
}

// A tear-off calendar page: the category's color on top, then the day.
function CalendarDate({ date, category }: { date: string; category: EventCategory }) {
  return (
    <div className="w-[4.75rem] shrink-0 overflow-hidden rounded-lg bg-paper text-center text-[#1d1b18] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)]">
      {/* Darkened a little so white text passes contrast on every category color. */}
      <div
        className="py-1 text-[11px] font-semibold tracking-[0.14em] text-white uppercase"
        style={{ background: `color-mix(in srgb, ${CATEGORY_COLOR[category]} 80%, black)` }}
      >
        {formatMonth(date)}
      </div>
      <div className="pt-1 text-3xl leading-none font-semibold">{formatDay(date)}</div>
      <div className="pt-1 pb-2 text-xs text-[#5d574f]">{formatWeekday(date)}</div>
    </div>
  );
}

async function EventDetail({ params }: { params: PageProps<"/events/[slug]">["params"] }) {
  const { slug } = await params;
  const client = await serverApi();
  const [{ event }, user] = await Promise.all([
    load(client.api.events[":slug"].$get({ param: { slug } })),
    currentUser(),
  ]);
  const started = new Date(event.startsAt) <= new Date();

  return (
    <>
      {/* Joined to the green header. The ticket panel below overlaps its bottom edge. */}
      <FullBleed className="photo photo-band -mt-8 text-hero-ink">
        <Column className="pt-4 pb-8 md:pb-24">
          <Link href="/events" className="text-sm text-hero-muted hover:text-hero-ink">
            ← All events
          </Link>
          <header className="mt-5 flex items-start gap-5">
            <CalendarDate date={event.startsAt} category={event.category} />
            <div className="min-w-0 md:max-w-[calc(100%-360px)]">
              <div className="flex flex-wrap items-center gap-2 text-sm text-hero-muted">
                <CategoryLabel category={event.category} />
                {event.status !== "cancelled" && (
                  <Countdown
                    startsAt={event.startsAt}
                    endsAt={event.endsAt}
                    initial={startsIn(event.startsAt, event.endsAt)}
                  />
                )}
                {event.status === "draft" && <span className="font-medium text-[#f3d27a]">Draft, only you can see this</span>}
                {event.status === "cancelled" && <span className="font-medium text-[#ffb3a8]">Cancelled</span>}
                {event.visibility === "unlisted" && <span>· Unlisted, only people with the link can see it</span>}
              </div>
              <h1 className="mt-1 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{event.title}</h1>
              <p className="mt-2 text-hero-muted">Hosted by {event.organizerName}</p>
            </div>
          </header>
        </Column>
      </FullBleed>

      {/* Phones: the panel, then the description. Wider: description left, panel right. */}
      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 md:mt-8 md:grid-cols-[1fr_320px] md:grid-rows-[auto_1fr]">
      <article className="md:col-start-1 md:row-start-1">
        <p className="text-lg leading-relaxed">{event.summary}</p>
        <div className="mt-4 space-y-4 leading-relaxed whitespace-pre-line text-ink/90">{event.description}</div>
      </article>

      {event.moreFromHost.length > 0 && (
        <section className="mt-2 md:col-start-1 md:self-start">
          <h2 className="mb-3 text-sm font-medium text-muted">More from {event.organizerName}</h2>
          <div className="space-y-3">
            {event.moreFromHost.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        </section>
      )}

      <aside className="row-start-1 md:col-start-2 md:row-span-2 md:row-start-1 md:-mt-36 md:sticky md:top-6 md:self-start">
        <div className="card relative space-y-4 overflow-hidden p-5 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.35)]">
          <div>
            <p className="font-medium">{formatFullDate(event.startsAt)}</p>
            <p className="text-sm text-muted">{formatTimeRange(event.startsAt, event.endsAt)}</p>
          </div>
          <div className="text-sm">
            {event.isOnline ? (
              event.location ? (
                <a href={event.location} className="link break-all">
                  {event.location}
                </a>
              ) : (
                <p>
                  Online. <span className="text-muted">The link shows up here once you have a spot.</span>
                </p>
              )
            ) : (
              <p>
                {event.location}
                <br />
                <span className="text-muted">{event.city}</span>
                <br />
                <a href={mapsUrl(event.location!, event.city)} className="link text-[13px]" target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              </p>
            )}
          </div>
          <CapacityMeter taken={event.confirmed} capacity={event.capacity} waitlisted={event.waitlisted} />
          <RegisterPanel
            eventId={event.id}
            title={event.title}
            when={`${formatWeekdayDate(event.startsAt)}, ${formatTime(event.startsAt)}`}
            slug={event.slug}
            eventStatus={event.status}
            started={started}
            spotsLeft={event.spotsLeft}
            isOrganizer={event.isOrganizer}
            loggedIn={!!user}
            registration={event.registration}
          />
          {event.status === "published" && <ShareButton title={event.title} path={`/events/${event.slug}`} />}
        </div>
      </aside>
      </div>
    </>
  );
}
