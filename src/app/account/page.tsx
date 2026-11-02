import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageBand } from "@/components/page-band";
import { AccountForms } from "@/components/account-forms";
import { currentUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <>
      <PageBand title="Account" />
      <div className="mx-auto max-w-xl">
      <Suspense fallback={<div data-loading className="card mt-6 h-96 animate-pulse" />}>
        <Account />
      </Suspense>
      </div>
    </>
  );
}

async function Account() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  return <AccountForms user={user} />;
}
