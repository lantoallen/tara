import { APP_NAME, AUTHOR, DEMO_MODE, REPO_URL } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {DEMO_MODE ? (
          <p>
            A demo project by{" "}
            <a href={AUTHOR.url} className="link">
              {AUTHOR.name}
            </a>
            . The people and events are made up, and everything resets daily.
          </p>
        ) : (
          <p>{APP_NAME}</p>
        )}
        <a href={REPO_URL} className="link">
          Source code
        </a>
      </div>
    </footer>
  );
}
