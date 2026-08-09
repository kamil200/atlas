import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/search/CommandPalette";
import { TopBar } from "@/components/shared/TopBar";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
});

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  // The landing page brings its own nav, so the app bar stays off it.
  const showTopBar = pathname !== "/";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-paper">
      {showTopBar ? <TopBar onOpenSearch={() => setSearchOpen(true)} /> : null}
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <Toaster position="bottom-right" />
    </div>
  );
}

function RouteError({ error }: { error: Error }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <h1 className="font-display text-[1.75rem] text-ink">Something broke on this screen</h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">{error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <h1 className="font-display text-[2rem] text-ink">Nothing at this corner</h1>
        <p className="mt-2 text-sm text-ink-soft">
          The page you were after is not here. The map still is.
        </p>
        <a
          href="/map"
          className="mt-5 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
        >
          Open the map
        </a>
      </div>
    </div>
  );
}
