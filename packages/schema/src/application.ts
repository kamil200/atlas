import { type Static, Type } from "@sinclair/typebox";
import { IsoDate, Nullable, StringEnum } from "./common";
import { ApplicationStatus, ApplyMethod } from "./enums";
import { JobSummary } from "./job";

/*
  One row covers saved and applied. The job is embedded because the tracker
  shows job details for roles the user may no longer be able to find by
  browsing — a closed job still belongs in your own history.
*/
export const ApplicationDto = Type.Object({
  id: Type.String(),
  jobId: Type.String(),
  status: StringEnum(ApplicationStatus),
  applyMethod: Nullable(StringEnum(ApplyMethod)),
  resumeId: Nullable(Type.String()),
  coverNote: Nullable(Type.String()),
  appliedAt: Nullable(IsoDate),
  createdAt: IsoDate,
  updatedAt: IsoDate,
  job: JobSummary,
});
export type ApplicationDto = Static<typeof ApplicationDto>;

export const ApplicationsQuery = Type.Object({
  status: Type.Optional(StringEnum(ApplicationStatus)),
});
export type ApplicationsQuery = Static<typeof ApplicationsQuery>;

export const ApplicationsListData = Type.Object({ items: Type.Array(ApplicationDto) });
export type ApplicationsListData = Static<typeof ApplicationsListData>;

export const ApplicationData = Type.Object({ application: ApplicationDto });
export type ApplicationData = Static<typeof ApplicationData>;

/* PUT /api/applications — idempotent save. */
export const SaveJobBody = Type.Object({ jobId: Type.String() });
export type SaveJobBody = Static<typeof SaveJobBody>;

/* DELETE /api/applications?jobId= — identity in the query string (PRD §7). */
export const UnsaveJobQuery = Type.Object({ jobId: Type.String() });
export type UnsaveJobQuery = Static<typeof UnsaveJobQuery>;

export const UpdateApplicationBody = Type.Object({
  jobId: Type.String(),
  status: StringEnum(ApplicationStatus),
});
export type UpdateApplicationBody = Static<typeof UpdateApplicationBody>;

export const SimpleApplyBody = Type.Object({
  jobId: Type.String(),
  resumeId: Type.String(),
  coverNote: Type.Optional(Type.String({ maxLength: 2000 })),
});
export type SimpleApplyBody = Static<typeof SimpleApplyBody>;
