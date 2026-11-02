import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { Suspense } from "react";
import { TicketBadge } from "@/components/badges";
import { TicketNotches } from "@/components/category-label";
import { SITE_URL } from "@/lib/config";
import { load, serverApi } from "@/lib/server-api";
import { formatFullDate, formatTime, formatTimeRange } from "@/lib/time";
import { mapsUrl } from "@/lib/maps";
import { SavedOffline } from "@/components/offline-tickets";
import { formatTicketCode } from "@/lib/tickets";

export const metadata: Metadata = { title: "Ticket" };

export default function TicketPage({ params }: PageProps<"/tickets/[code]">) {
  return (
    <div className="mx-auto max-w-md">
      <Link href="/tickets" className="text-sm text-muted hover:text-ink">
        ← My tickets
      </Link>
      <Suspense fallback={<div data-loading className="card mt-4 h-[520px] animate-pulse" />}>
        <Ticket params={params} />
      </Suspense>
    </div>
  );
}

async function Ticket({ params }: { params: PageProps<"/tickets/[code]">["params"] }) {
  const { code } = await params;
  const client = await serverApi();
  const { ticket } = await load(client.api.me.tickets[":code"].$get({ param: { code } }), {
    returnTo: `/tickets/${code}`,
  });
  const { event } = ticket;
  const valid = ticket.status === "confirmed" && event.status !== "cancelled";

  // The QR holds the ticket's URL: the door scanner reads the code out of it,
  // and a phone camera opens this page.
  const qr = valid
    ? await QRCode.toString(`${SITE_URL}/tickets/${ticket.ticketCode}`, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#1d1b18", light: "#ffffff" },
      })
    : null;

  return (
    <div data-keep-offline className="card mt-4 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/events/${event.slug}`} className="text-lg leading-snug font-semibold hover:underline">
            {event.title}
          </Link>
          <TicketBadge
            status={ticket.status}
            checkedInAt={ticket.checkedInAt}
            waitlistPosition={ticket.waitlistPosition}
            eventStatus={event.status}
          />
        </div>
        <p className="mt-2 text-sm">{formatFullDate(event.startsAt)}</p>
        <p className="text-sm text-muted">{formatTimeRange(event.startsAt, event.endsAt)}</p>
        <p className="mt-2 text-sm break-words">
          {event.isOnline ? (
            event.location ? (
              <a href={event.location} className="link">
                {event.location}
              </a>
            ) : (
              "Online"
            )
          ) : (
            <>
              {event.location}, {event.city}{" "}
              <a href={mapsUrl(event.location!, event.city)} className="link whitespace-nowrap" target="_blank" rel="noreferrer">
                Map
              </a>
            </>
          )}
        </p>
      </div>

      <div className="relative border-t-2 border-dashed border-line-strong bg-surface-2 p-5 text-center">
        <TicketNotches inset={1} />
        {qr ? (
          <>
            <div
              className="mx-auto w-56 rounded-md bg-white p-3"
              role="img"
              aria-label={`QR code for ticket ${formatTicketCode(ticket.ticketCode)}`}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="mt-3 font-mono text-lg tracking-widest">{formatTicketCode(ticket.ticketCode)}</p>
            <p className="text-sm text-muted">{ticket.holder.name}</p>
            {ticket.checkedInAt ? (
              <p className="mt-3 text-sm text-ok">Checked in at {formatTime(ticket.checkedInAt)}</p>
            ) : (
              <p className="mt-3 text-[13px] text-muted">Show this at the door. They can also type the code.</p>
            )}
            {!ticket.checkedInAt && new Date(event.endsAt) > new Date() && (
              <SavedOffline paths={[`/tickets/${ticket.ticketCode}`]} className="mt-1 justify-center">
                Saved on this device, so it opens with no signal.
              </SavedOffline>
            )}
            {new Date(event.endsAt) > new Date() && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <a href={`/api/me/tickets/${ticket.ticketCode}/calendar`} className="btn-secondary btn-sm" download>
                  Add to calendar
                </a>
                <a href={googleCalendarUrl(ticket)} className="btn-secondary btn-sm" target="_blank" rel="noreferrer">
                  Google Calendar
                </a>
              </div>
            )}
          </>
        ) : event.status === "cancelled" ? (
          <p className="py-6 text-sm">This event was cancelled, so the ticket won&apos;t be used.</p>
        ) : ticket.status === "waitlisted" ? (
          <p className="py-6 text-sm">
            You&apos;re number {ticket.waitlistPosition} on the waitlist. Your QR code shows up here once a spot opens.
          </p>
        ) : (
          <p className="py-6 text-sm">You cancelled this registration.</p>
        )}
      </div>
    </div>
  );
}

type TicketForCalendar = {
  ticketCode: string;
  event: { slug: string; title: string; startsAt: string; endsAt: string; isOnline: boolean; location: string | null; city: string };
};

// Google's "add event" link. Times go in as UTC, like 20261103T080000Z.
function googleCalendarUrl({ ticketCode, event }: TicketForCalendar) {
  const stamp = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.startsAt)}/${stamp(event.endsAt)}`,
    details: `Your ticket: ${formatTicketCode(ticketCode)}\n${SITE_URL}/tickets/${ticketCode}`,
    location: event.isOnline ? (event.location ?? "Online") : `${event.location}, ${event.city}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
