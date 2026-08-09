import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Check, LogOut, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { useLogoutMutation } from "@/store/api/auth-api";
import { baseApi } from "@/store/api/base-api";
import { useAppDispatch } from "@/store/hooks";
import { Wordmark } from "./Logo";

export function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { user, isAuthenticated } = useCurrentUser();
  const { savedCount, appliedCount } = useSavedJobs();
  const [logout] = useLogoutMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    // One line clears every user-scoped cache instead of chasing tags.
    dispatch(baseApi.util.resetApiState());
    navigate({ to: "/" });
  };

  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-paper px-3 sm:px-4">
      {/* The negative margin keeps the wordmark optically flush with the page
          edge while the padding still gives the link a real hit target. */}
      <Link
        to="/"
        className="-ml-1.5 shrink-0 rounded-md px-1.5 py-1.5 transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
      >
        <Wordmark />
      </Link>

      {/* Styled as a search field but it opens the palette — same as the reference. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-2 flex h-10 max-w-sm flex-1 items-center gap-2.5 rounded-full border border-line bg-paper px-4 text-left text-sm text-ink-soft shadow-sm transition-colors hover:border-ink-soft/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
      >
        <Search className="size-[18px] shrink-0" aria-hidden="true" />
        <span className="truncate">Search companies, roles, cities</span>
        <kbd className="font-mono ml-auto hidden shrink-0 rounded-full bg-paper-2 px-2 py-0.5 text-[10px] text-ink-soft sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {isAuthenticated ? (
          <>
            <Counter
              to="/tracker"
              icon={<Bookmark className="size-4" />}
              count={savedCount}
              label="Saved"
            />
            <Counter
              to="/tracker"
              icon={<Check className="size-4" />}
              count={appliedCount}
              label="Applied"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Your account"
                  className="grid size-9 place-items-center rounded-full border border-line bg-paper text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
                >
                  {user?.name?.[0]?.toUpperCase() ?? <UserRound className="size-4" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate font-normal text-ink-soft">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/tracker">Tracker</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings/resumes">Resumes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/submit-company">
                    <Sparkles className="size-4" aria-hidden="true" />
                    Add a company
                  </Link>
                </DropdownMenuItem>
                {user?.role === "ADMIN" ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/submissions">
                      <ShieldCheck className="size-4" aria-hidden="true" />
                      Review queue
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button asChild size="sm">
            <Link to="/auth/login">Log in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

function Counter({
  to,
  icon,
  count,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  count: number;
  label: string;
}) {
  return (
    <Link
      to={to}
      aria-label={`${count} ${label.toLowerCase()}`}
      className="hidden items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-ink-soft shadow-sm transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500 sm:flex"
    >
      {icon}
      {/* Tabular numerals so the bar does not shift when a count ticks over. */}
      <span className="font-mono text-[11px] text-ink">{count}</span>
    </Link>
  );
}
