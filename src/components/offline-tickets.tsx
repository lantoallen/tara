"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker, saveForOffline } from "@/lib/offline-tickets";

export function RegisterServiceWorker() {
  useEffect(registerServiceWorker, []);
  return null;
}

// Saves these ticket pages on the device, then says so. The line keeps its
// height while it waits, so nothing moves when it shows up. Without children
// it only saves (My tickets uses that to drop tickets that aren't coming up).
export function SavedOffline({
  paths,
  only = false,
  className = "",
  children,
}: {
  paths: string[];
  only?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [saved, setSaved] = useState(false);
  const key = paths.join(" ");
  useEffect(() => {
    let current = true;
    void saveForOffline(key ? key.split(" ") : [], { only }).then((count) => {
      if (current) setSaved(count > 0);
    });
    return () => {
      current = false;
    };
  }, [key, only]);

  if (!children) return null;
  return (
    <p className={`flex items-center gap-1.5 text-[13px] text-muted ${saved ? "" : "invisible"} ${className}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-ok"
        aria-hidden="true"
      >
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
      {children}
    </p>
  );
}
