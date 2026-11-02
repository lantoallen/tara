import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventForm } from "@/components/organizer/event-form";
import { load, serverApi } from "@/lib/server-api";

export const metadata: Metadata = { title: "Edit event" };

export default function EditEventPage({ params }: PageProps<"/organize/[id]/edit">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<div data-loading className="card h-[640px] animate-pulse" />}>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}

async function Edit({ params }: { params: PageProps<"/organize/[id]/edit">["params"] }) {
  const { id } = await params;
  const client = await serverApi();
  const { event } = await load(client.api.organizer.events[":id"].$get({ param: { id } }), {
    returnTo: `/organize/${id}/edit`,
  });
  return (
    <>
      <Link href={`/organize/${id}`} className="text-sm text-muted hover:text-ink">
        ← {event.title}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold tracking-tight">Edit event</h1>
      <EventForm event={event} />
    </>
  );
}
