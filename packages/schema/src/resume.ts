import { type Static, Type } from "@sinclair/typebox";
import { IsoDate } from "./common";

/* storageKey never leaves the server — downloads stream through the API. */
export const ResumeDto = Type.Object({
  id: Type.String(),
  filename: Type.String(),
  mimeType: Type.String(),
  sizeBytes: Type.Integer(),
  isDefault: Type.Boolean(),
  createdAt: IsoDate,
});
export type ResumeDto = Static<typeof ResumeDto>;

export const ResumesListData = Type.Object({ items: Type.Array(ResumeDto) });
export type ResumesListData = Static<typeof ResumesListData>;

export const ResumeData = Type.Object({ resume: ResumeDto });
export type ResumeData = Static<typeof ResumeData>;

export const ResumeIdQuery = Type.Object({ id: Type.String() });
export type ResumeIdQuery = Static<typeof ResumeIdQuery>;

export const SetDefaultResumeBody = Type.Object({
  id: Type.String(),
  isDefault: Type.Literal(true),
});
export type SetDefaultResumeBody = Static<typeof SetDefaultResumeBody>;

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

export const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;
