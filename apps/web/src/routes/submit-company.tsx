import { FUNDING_STAGE_LABELS, FundingStage, type SubmitOfficeInput } from "@atlas/schema";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthSubmitError } from "@/components/auth/AuthShell";
import { PageShell, RequireAuth } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useGetMySubmissionsQuery, useSubmitCompanyMutation } from "@/store/api/submission-api";

export const Route = createFileRoute("/submit-company")({ component: SubmitCompanyPage });

/*
  Offices have no id until they are saved, so each row carries a local key.
  Using the array index instead would make React reuse the wrong input when a
  row is removed from the middle.
*/
/*
  Coordinates are held as the raw text typed, not as numbers.

  A number input reports an empty value for anything half-finished — including
  the lone "-" you must type first to reach a western longitude — and Number("")
  is 0. Binding straight to a number therefore rewrote the field to 0 mid
  keystroke, so no office outside the eastern hemisphere could be entered at all.
  The text is parsed and range-checked once, on submit.
*/
type OfficeRow = Omit<SubmitOfficeInput, "lat" | "lng"> & {
  key: string;
  lat: string;
  lng: string;
};

let officeKeySeq = 0;
function newOffice(isHq: boolean): OfficeRow {
  officeKeySeq += 1;
  return {
    key: `office-${officeKeySeq}`,
    city: "",
    country: "India",
    lat: "12.9352",
    lng: "77.6245",
    isHq,
  };
}

/* Returns the number when the text is a real coordinate in range, else null. */
function parseCoordinate(raw: string, limit: number): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < -limit || value > limit) return null;
  return value;
}

function SubmitCompanyPage() {
  return (
    <RequireAuth>
      <SubmitCompanyContent />
    </RequireAuth>
  );
}

function SubmitCompanyContent() {
  const [submit, { isLoading }] = useSubmitCompanyMutation();
  const { data, isLoading: loadingMine } = useGetMySubmissionsQuery();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [industries, setIndustries] = useState("");
  const [fundingStage, setFundingStage] = useState<string>("");
  const [offices, setOffices] = useState<OfficeRow[]>([newOffice(true)]);
  const [error, setError] = useState<string>();

  const updateOffice = (key: string, patch: Partial<Omit<OfficeRow, "key">>) => {
    setOffices((current) =>
      current.map((office) => (office.key === key ? { ...office, ...patch } : office)),
    );
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);

    const parsedOffices: SubmitOfficeInput[] = [];
    for (const { key: _key, lat, lng, ...rest } of offices) {
      const latitude = parseCoordinate(lat, 90);
      const longitude = parseCoordinate(lng, 180);

      if (latitude === null || longitude === null) {
        setError(
          `Check the coordinates for ${rest.city || "that office"}. Latitude runs -90 to 90, longitude -180 to 180.`,
        );
        return;
      }
      parsedOffices.push({ ...rest, lat: latitude, lng: longitude });
    }

    try {
      await submit({
        name,
        tagline: tagline || undefined,
        description,
        website: website || undefined,
        industries: industries
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8),
        hiringStatus: "ACTIVELY_HIRING",
        fundingStage: fundingStage ? (fundingStage as keyof typeof FundingStage) : undefined,
        offices: parsedOffices,
        founders: [],
      }).unwrap();

      toast.success("Sent for review. We will look at it shortly.");
      setName("");
      setTagline("");
      setDescription("");
      setWebsite("");
      setIndustries("");
      setOffices([newOffice(true)]);
    } catch (caught) {
      setError((caught as { message?: string }).message ?? "That did not send. Try again.");
    }
  };

  return (
    <PageShell
      title="Add a company"
      subtitle="Know a startup that belongs on the map? Send it over and an admin will review it."
    >
      <form onSubmit={send} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Company name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="What they do, in one line"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            required
            minLength={20}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="At least a couple of sentences on what they build and who for."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stage">Funding stage</Label>
            <Select value={fundingStage} onValueChange={setFundingStage}>
              <SelectTrigger id="stage" className="w-full">
                <SelectValue placeholder="Not sure" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(FundingStage).map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {FUNDING_STAGE_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="industries">Industries</Label>
          <Input
            id="industries"
            value={industries}
            onChange={(e) => setIndustries(e.target.value)}
            placeholder="Fintech, SaaS"
          />
          <p className="text-xs text-ink-soft">Separate with commas.</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Offices</legend>
          {offices.map((office, index) => (
            <div key={office.key} className="rounded-lg border border-line bg-paper-2/40 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`city-${index}`}>City</Label>
                  <Input
                    id={`city-${index}`}
                    required
                    value={office.city}
                    onChange={(e) => updateOffice(office.key, { city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`country-${index}`}>Country</Label>
                  <Input
                    id={`country-${index}`}
                    required
                    value={office.country}
                    onChange={(e) => updateOffice(office.key, { country: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`lat-${index}`}>Latitude</Label>
                  <Input
                    id={`lat-${index}`}
                    type="text"
                    inputMode="decimal"
                    required
                    value={office.lat}
                    onChange={(e) => updateOffice(office.key, { lat: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`lng-${index}`}>Longitude</Label>
                  <Input
                    id={`lng-${index}`}
                    type="text"
                    inputMode="decimal"
                    required
                    value={office.lng}
                    onChange={(e) => updateOffice(office.key, { lng: e.target.value })}
                  />
                </div>
              </div>

              {offices.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setOffices((current) => current.filter((row) => row.key !== office.key))
                  }
                  className="mt-2 flex items-center gap-1 text-xs text-ink-soft hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove this office
                </button>
              ) : null}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOffices((current) => [...current, newOffice(false)])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add another office
          </Button>
        </fieldset>

        <AuthSubmitError message={error} />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Sending…" : "Send for review"}
        </Button>
      </form>

      <section className="mt-12">
        <h2 className="font-mono mb-3 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          Your submissions
        </h2>
        {loadingMine ? (
          <Skeleton className="h-14 rounded-lg" />
        ) : (data?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-soft">Nothing sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {data?.items.map((submission) => (
              <li
                key={submission.id}
                className="flex items-center gap-3 rounded-lg border border-line bg-paper p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{submission.companyName}</p>
                  <p className="font-mono mt-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                    {submission.officeCount} office{submission.officeCount === 1 ? "" : "s"}
                    {submission.adminNote ? ` · ${submission.adminNote}` : ""}
                  </p>
                </div>
                <StatusChip status={submission.submissionStatus} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

function StatusChip({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const style =
    status === "APPROVED"
      ? "bg-peepal-tint text-peepal-700"
      : status === "REJECTED"
        ? "bg-danger/10 text-danger"
        : // Same AA fix as the tracker's Interviewing chip.
          "bg-marigold-tint text-[#6F5600]";
  const label =
    status === "APPROVED" ? "Approved" : status === "REJECTED" ? "Rejected" : "In review";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${style}`}>
      {label}
    </span>
  );
}
