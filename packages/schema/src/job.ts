import { type Static, Type } from "@sinclair/typebox";
import { IsoDate, Nullable, PageQuery, StringEnum } from "./common";
import { JobStatus, WorkMode } from "./enums";
import { FilterParams } from "./filters";

/*
  Flat on purpose. A job row in the sidebar shows "department · city · mode"
  and nothing nested, so the DTO carries those names directly instead of
  making the client walk company.department.name.
*/
export const JobSummary = Type.Object({
  id: Type.String(),
  title: Type.String(),
  companyId: Type.String(),
  companySlug: Type.String(),
  companyName: Type.String(),
  companyLogoUrl: Nullable(Type.String()),
  departmentName: Type.String(),
  departmentSlug: Type.String(),
  city: Nullable(Type.String()),
  country: Nullable(Type.String()),
  workMode: StringEnum(WorkMode),
  seniority: Nullable(Type.String()),
  salaryMin: Nullable(Type.Integer()),
  salaryMax: Nullable(Type.Integer()),
  currency: Type.String(),
  status: StringEnum(JobStatus),
  hasExternalApply: Type.Boolean(),
  postedAt: IsoDate,
});
export type JobSummary = Static<typeof JobSummary>;

export const JobDetail = Type.Composite([
  JobSummary,
  Type.Object({
    description: Type.String(),
    applyUrl: Nullable(Type.String()),
  }),
]);
export type JobDetail = Static<typeof JobDetail>;

export const JobSort = {
  RECENT: "recent",
  SALARY: "salary",
} as const;
export type JobSort = (typeof JobSort)[keyof typeof JobSort];

export const JobsQuery = Type.Composite([
  FilterParams,
  PageQuery,
  Type.Object({
    sort: Type.Optional(StringEnum(JobSort)),
  }),
]);
export type JobsQuery = Static<typeof JobsQuery>;

export const JobsListData = Type.Object({
  items: Type.Array(JobSummary),
  total: Type.Integer(),
  page: Type.Integer(),
  pageSize: Type.Integer(),
});
export type JobsListData = Static<typeof JobsListData>;

export const JobQuery = Type.Object({ id: Type.String() });
export type JobQuery = Static<typeof JobQuery>;

export const JobData = Type.Object({ job: JobDetail });
export type JobData = Static<typeof JobData>;
