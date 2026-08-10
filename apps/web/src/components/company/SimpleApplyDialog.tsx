import type { JobSummary } from "@atlas/schema";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSimpleApplyMutation } from "@/store/api/application-api";
import { useGetResumesQuery } from "@/store/api/resume-api";

export function SimpleApplyDialog({
  job,
  open,
  onOpenChange,
}: {
  job: JobSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isAuthenticated } = useCurrentUser();
  const { data, isLoading } = useGetResumesQuery(undefined, { skip: !open || !isAuthenticated });
  const [simpleApply, { isLoading: isSubmitting }] = useSimpleApplyMutation();

  const [chosenResumeId, setChosenResumeId] = useState<string>("");
  const [coverNote, setCoverNote] = useState("");

  const resumes = data?.items ?? [];

  /*
    Derived, not mirrored. The pick only counts while that resume still exists,
    so deleting it in another tab falls back to the default instead of leaving
    this dialog submitting an id the server no longer knows.
  */
  const resumeId = resumes.some((resume) => resume.id === chosenResumeId)
    ? chosenResumeId
    : ((resumes.find((resume) => resume.isDefault) ?? resumes[0])?.id ?? "");

  const submit = async () => {
    try {
      await simpleApply({
        jobId: job.id,
        resumeId,
        coverNote: coverNote.trim() || undefined,
      }).unwrap();
      toast.success("Applied. Fingers crossed.");
      onOpenChange(false);
      setCoverNote("");
    } catch {
      toast.error("Couldn't send that application. Check your connection and try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to {job.title}</DialogTitle>
          <DialogDescription>
            {job.companyName} gets your resume and note. Nothing else is shared.
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <p className="text-sm text-ink-soft">
            <Link to="/auth/login" className="font-medium text-peepal-700 hover:underline">
              Sign in
            </Link>{" "}
            to apply without leaving the map.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-ink-soft">Loading your resumes…</p>
        ) : resumes.length === 0 ? (
          // The empty state has to offer the fix, not just name the problem.
          <div className="rounded-md border border-line bg-paper-2 p-4">
            <p className="text-sm text-ink">You have not uploaded a resume yet.</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/settings/resumes">Upload one</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="resume">Resume</Label>
              <Select value={resumeId} onValueChange={setChosenResumeId}>
                <SelectTrigger id="resume" className="w-full">
                  <SelectValue placeholder="Pick a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.filename}
                      {resume.isDefault ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cover-note">Cover note (optional)</Label>
              <Textarea
                id="cover-note"
                value={coverNote}
                onChange={(event) => setCoverNote(event.target.value)}
                placeholder="A few lines on why this role, and what you have shipped."
                rows={4}
                maxLength={2000}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!resumeId || isSubmitting}>
            {isSubmitting ? "Sending…" : "Send application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
