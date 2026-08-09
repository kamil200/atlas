import { RESUME_EXTENSIONS, RESUME_MAX_BYTES } from "@chowk/schema";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageShell, RequireAuth } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteResumeMutation,
  useGetResumesQuery,
  useSetDefaultResumeMutation,
  useUploadResumeMutation,
} from "@/store/api/resume-api";

export const Route = createFileRoute("/settings/resumes")({ component: ResumesPage });

function ResumesPage() {
  return (
    <RequireAuth>
      <ResumesContent />
    </RequireAuth>
  );
}

function ResumesContent() {
  const { data, isLoading } = useGetResumesQuery();
  const [upload, { isLoading: isUploading }] = useUploadResumeMutation();
  const [remove] = useDeleteResumeMutation();
  const [setDefault] = useSetDefaultResumeMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const send = async (file: File) => {
    // Checked here too so an oversized file fails instantly instead of uploading.
    if (file.size > RESUME_MAX_BYTES) {
      toast.error("That file is larger than 5MB.");
      return;
    }
    try {
      await upload(file).unwrap();
      toast.success("Resume uploaded.");
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Couldn't upload that file.");
    }
  };

  const resumes = data?.items ?? [];

  return (
    <PageShell title="Resumes" subtitle="Upload once, then apply in two clicks.">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) send(file);
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 transition-colors ${
          dragging
            ? "border-peepal-500 bg-peepal-tint/40"
            : "border-line bg-paper-2/50 hover:bg-paper-2"
        }`}
      >
        <Upload className="size-5 text-ink-soft" aria-hidden="true" />
        <span className="text-sm font-medium text-ink">
          {isUploading ? "Uploading…" : "Drop a file or click to choose"}
        </span>
        <span className="text-xs text-ink-soft">{RESUME_EXTENSIONS.join(", ")} up to 5MB</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={RESUME_EXTENSIONS.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) send(file);
          event.target.value = "";
        }}
      />

      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((row) => (
              <Skeleton key={row} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No resumes yet. The first one you upload becomes your default.
          </p>
        ) : (
          <ul className="space-y-2">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className="flex items-center gap-3 rounded-lg border border-line bg-paper p-3 shadow-card"
              >
                <FileText className="size-5 shrink-0 text-ink-soft" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{resume.filename}</p>
                  <p className="font-mono mt-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                    {(resume.sizeBytes / 1024).toFixed(0)} KB
                    {resume.isDefault ? " · default" : ""}
                  </p>
                </div>

                {resume.isDefault ? (
                  <span className="rounded-full bg-peepal-tint px-2 py-0.5 text-[10px] font-medium text-peepal-700">
                    Default
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDefault(resume.id)}
                    className="text-xs"
                  >
                    <Star className="size-3.5" aria-hidden="true" />
                    Make default
                  </Button>
                )}

                <a
                  href={`/api/resumes/download?id=${encodeURIComponent(resume.id)}`}
                  aria-label={`Download ${resume.filename}`}
                  className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-soft hover:bg-paper-2 hover:text-ink"
                >
                  <Download className="size-4" aria-hidden="true" />
                </a>

                <button
                  type="button"
                  onClick={() => remove(resume.id)}
                  aria-label={`Delete ${resume.filename}`}
                  className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-soft transition-colors hover:bg-paper-2 hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
