import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventForm } from "@/components/organizer/event-form";
import { currentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/organize" className="text-sm text-muted hover:text-ink">
        ← Your events
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold tracking-tight">New event</h1>
      <Suspense fallback={<div data-loading className="card h-[640px] animate-pulse" />}>
        <SignedInForm />
      </Suspense>
    </div>
  );
}

async function SignedInForm() {
  if (!(await currentUser())) redirect("/login?next=/organize/new");
  return <EventForm />;
}
