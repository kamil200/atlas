import { useNavigate } from "@tanstack/react-router";
import { Briefcase, Building2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLazySearchQuery } from "@/store/api/discovery-api";

const RECENTS_KEY = "chowk.recent-searches";
const MAX_RECENTS = 5;
const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

type Recent = { label: string; companySlug?: string; jobId?: string; city?: string };

function readRecents(): Recent[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as Recent[]) : [];
  } catch {
    // A corrupted entry is not worth a crash on the search box.
    return [];
  }
}

function pushRecent(entry: Recent) {
  const next = [entry, ...readRecents().filter((item) => item.label !== entry.label)].slice(
    0,
    MAX_RECENTS,
  );
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [runSearch, { data, isFetching }] = useLazySearchQuery();
  const [recents, setRecents] = useState<Recent[]>([]);

  useEffect(() => {
    if (open) setRecents(readRecents());
  }, [open]);

  // Debounced so typing "engineer" is one request, not eight.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) return;
    const timer = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const go = (entry: Recent) => {
    pushRecent(entry);
    onOpenChange(false);
    setQuery("");
    navigate({
      to: "/map",
      search: (prev) => ({
        ...prev,
        companySlug: entry.companySlug,
        jobId: entry.jobId,
        city: entry.city ? [entry.city] : prev.city,
      }),
    });
  };

  const showRecents = query.trim().length < MIN_QUERY && recents.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Search Chowk</DialogTitle>
        <DialogDescription className="sr-only">Find companies, roles, and cities</DialogDescription>
        {/*
          Filtering is off because the server already did it. Left on, cmdk
          would filter the results a second time against the raw input and
          hide perfectly good matches.
        */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search companies, roles, cities…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {showRecents ? (
              <CommandGroup heading="Recent">
                {recents.map((entry) => (
                  <CommandItem key={entry.label} value={entry.label} onSelect={() => go(entry)}>
                    {entry.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {query.trim().length < MIN_QUERY ? (
              !showRecents ? (
                <CommandEmpty>Type at least two letters.</CommandEmpty>
              ) : null
            ) : isFetching && !data ? (
              <CommandEmpty>Looking…</CommandEmpty>
            ) : !data ||
              (data.companies.length === 0 &&
                data.jobs.length === 0 &&
                data.locations.length === 0) ? (
              <CommandEmpty>Nothing matched. Try a shorter word.</CommandEmpty>
            ) : (
              <>
                {data.companies.length > 0 ? (
                  <CommandGroup heading="Companies">
                    {data.companies.map((company) => (
                      <CommandItem
                        key={company.slug}
                        value={`company-${company.slug}`}
                        onSelect={() => go({ label: company.name, companySlug: company.slug })}
                      >
                        <Building2 className="size-4 text-ink-soft" aria-hidden="true" />
                        {company.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}

                {data.jobs.length > 0 ? (
                  <CommandGroup heading="Roles">
                    {data.jobs.map((job) => (
                      <CommandItem
                        key={job.id}
                        value={`job-${job.id}`}
                        onSelect={() =>
                          go({
                            label: job.title,
                            companySlug: job.companySlug,
                            jobId: job.id,
                          })
                        }
                      >
                        <Briefcase className="size-4 text-ink-soft" aria-hidden="true" />
                        <span className="truncate">{job.title}</span>
                        <span className="ml-auto shrink-0 text-xs text-ink-soft">
                          {job.companyName}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}

                {data.locations.length > 0 ? (
                  <CommandGroup heading="Cities">
                    {data.locations.map((location) => (
                      <CommandItem
                        key={location.city}
                        value={`city-${location.city}`}
                        onSelect={() => go({ label: location.city, city: location.city })}
                      >
                        <MapPin className="size-4 text-ink-soft" aria-hidden="true" />
                        {location.city}
                        <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-soft">
                          {location.companyCount}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
