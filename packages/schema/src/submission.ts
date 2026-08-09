import { type Static, Type } from "@sinclair/typebox";
import { IsoDate, Nullable, StringEnum } from "./common";
import { FundingStage, HiringStatus, SubmissionStatus } from "./enums";

export const SubmitOfficeInput = Type.Object({
  city: Type.String({ minLength: 1, maxLength: 80 }),
  country: Type.String({ minLength: 1, maxLength: 80 }),
  addressLine: Type.Optional(Type.String({ maxLength: 200 })),
  lat: Type.Number({ minimum: -90, maximum: 90 }),
  lng: Type.Number({ minimum: -180, maximum: 180 }),
  isHq: Type.Boolean(),
});
export type SubmitOfficeInput = Static<typeof SubmitOfficeInput>;

export const SubmitFounderInput = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 80 }),
  title: Type.String({ minLength: 1, maxLength: 80 }),
  linkedinUrl: Type.Optional(Type.String({ maxLength: 300 })),
});
export type SubmitFounderInput = Static<typeof SubmitFounderInput>;

/*
  A submission creates a real Company row with submissionStatus PENDING.
  Approving it flips one enum, so nothing has to be migrated between tables.
*/
export const SubmitCompanyBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  tagline: Type.Optional(Type.String({ maxLength: 160 })),
  description: Type.String({ minLength: 20, maxLength: 4000 }),
  website: Type.Optional(Type.String({ maxLength: 300 })),
  industries: Type.Array(Type.String({ maxLength: 60 }), { maxItems: 8 }),
  foundedYear: Type.Optional(Type.Integer({ minimum: 1800, maximum: 2100 })),
  employeeCount: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000000 })),
  hiringStatus: StringEnum(HiringStatus),
  fundingStage: Type.Optional(StringEnum(FundingStage)),
  offices: Type.Array(SubmitOfficeInput, { minItems: 1, maxItems: 10 }),
  founders: Type.Array(SubmitFounderInput, { maxItems: 10 }),
});
export type SubmitCompanyBody = Static<typeof SubmitCompanyBody>;

export const SubmitCompanyData = Type.Object({
  companyId: Type.String(),
  submissionStatus: StringEnum(SubmissionStatus),
});
export type SubmitCompanyData = Static<typeof SubmitCompanyData>;

export const SubmissionWithCompany = Type.Object({
  id: Type.String(),
  companyId: Type.String(),
  companyName: Type.String(),
  companySlug: Type.String(),
  submissionStatus: StringEnum(SubmissionStatus),
  submittedByName: Type.String(),
  submittedByEmail: Type.String(),
  officeCount: Type.Integer(),
  adminNote: Nullable(Type.String()),
  createdAt: IsoDate,
  reviewedAt: Nullable(IsoDate),
});
export type SubmissionWithCompany = Static<typeof SubmissionWithCompany>;

export const SubmissionsListData = Type.Object({
  items: Type.Array(SubmissionWithCompany),
});
export type SubmissionsListData = Static<typeof SubmissionsListData>;

export const SubmissionData = Type.Object({ submission: SubmissionWithCompany });
export type SubmissionData = Static<typeof SubmissionData>;

export const AdminSubmissionsQuery = Type.Object({
  status: Type.Optional(StringEnum(SubmissionStatus)),
});
export type AdminSubmissionsQuery = Static<typeof AdminSubmissionsQuery>;

/* Admins can only move a submission to a decided state, never back to PENDING. */
export const ReviewSubmissionBody = Type.Object({
  id: Type.String(),
  status: StringEnum({
    APPROVED: SubmissionStatus.APPROVED,
    REJECTED: SubmissionStatus.REJECTED,
  }),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
});
export type ReviewSubmissionBody = Static<typeof ReviewSubmissionBody>;
