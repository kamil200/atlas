import { type Static, Type } from "@sinclair/typebox";
import { Nullable, PageQuery, StringEnum } from "./common";
import { FundingStage, HiringStatus } from "./enums";
import { FilterParams } from "./filters";
import { JobSummary } from "./job";

export const OfficeDto = Type.Object({
  id: Type.String(),
  city: Type.String(),
  country: Type.String(),
  addressLine: Nullable(Type.String()),
  lat: Type.Number(),
  lng: Type.Number(),
  isHq: Type.Boolean(),
  openJobCount: Type.Integer(),
});
export type OfficeDto = Static<typeof OfficeDto>;

export const FounderDto = Type.Object({
  id: Type.String(),
  name: Type.String(),
  title: Type.String(),
  linkedinUrl: Nullable(Type.String()),
  photoUrl: Nullable(Type.String()),
});
export type FounderDto = Static<typeof FounderDto>;

export const InvestorDto = Type.Object({
  id: Type.String(),
  name: Type.String(),
  logoUrl: Nullable(Type.String()),
  website: Nullable(Type.String()),
  round: Nullable(StringEnum(FundingStage)),
});
export type InvestorDto = Static<typeof InvestorDto>;

export const CompanySummary = Type.Object({
  id: Type.String(),
  slug: Type.String(),
  name: Type.String(),
  logoUrl: Nullable(Type.String()),
  tagline: Nullable(Type.String()),
  industries: Type.Array(Type.String()),
  hiringStatus: StringEnum(HiringStatus),
  fundingStage: Nullable(StringEnum(FundingStage)),
  employeeCount: Nullable(Type.Integer()),
  cities: Type.Array(Type.String()),
  openJobCount: Type.Integer(),
});
export type CompanySummary = Static<typeof CompanySummary>;

/*
  Money is BigInt in the database but plain number here — USD amounts are far
  below 2^53, and JSON.stringify throws on a BigInt. The conversion happens in
  the server's serializers, never in a route handler.
*/
export const CompanyDetail = Type.Object({
  id: Type.String(),
  slug: Type.String(),
  name: Type.String(),
  logoUrl: Nullable(Type.String()),
  tagline: Nullable(Type.String()),
  description: Type.String(),
  website: Nullable(Type.String()),
  industries: Type.Array(Type.String()),
  foundedYear: Nullable(Type.Integer()),
  employeeCount: Nullable(Type.Integer()),
  hiringStatus: StringEnum(HiringStatus),
  fundingStage: Nullable(StringEnum(FundingStage)),
  totalFundingUsd: Nullable(Type.Number()),
  valuationUsd: Nullable(Type.Number()),
  offices: Type.Array(OfficeDto),
  founders: Type.Array(FounderDto),
  investors: Type.Array(InvestorDto),
  jobs: Type.Array(JobSummary),
});
export type CompanyDetail = Static<typeof CompanyDetail>;

/* One pin on the map. Kept thin — the whole filtered set ships in one response. */
export const OfficeMapPoint = Type.Object({
  officeId: Type.String(),
  companyId: Type.String(),
  companySlug: Type.String(),
  companyName: Type.String(),
  logoUrl: Nullable(Type.String()),
  lat: Type.Number(),
  lng: Type.Number(),
  isHq: Type.Boolean(),
  hiringStatus: StringEnum(HiringStatus),
  openJobCount: Type.Integer(),
});
export type OfficeMapPoint = Static<typeof OfficeMapPoint>;

export const CompaniesQuery = Type.Composite([FilterParams, PageQuery]);
export type CompaniesQuery = Static<typeof CompaniesQuery>;

export const CompaniesListData = Type.Object({
  items: Type.Array(CompanySummary),
  total: Type.Integer(),
  page: Type.Integer(),
  pageSize: Type.Integer(),
});
export type CompaniesListData = Static<typeof CompaniesListData>;

export const CompanyQuery = Type.Object({ slug: Type.String() });
export type CompanyQuery = Static<typeof CompanyQuery>;

export const CompanyData = Type.Object({ company: CompanyDetail });
export type CompanyData = Static<typeof CompanyData>;

export const CompaniesMapData = Type.Object({ offices: Type.Array(OfficeMapPoint) });
export type CompaniesMapData = Static<typeof CompaniesMapData>;
