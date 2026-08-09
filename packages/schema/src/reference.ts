import { type Static, Type } from "@sinclair/typebox";
import { Nullable } from "./common";

export const DepartmentDto = Type.Object({
  id: Type.String(),
  name: Type.String(),
  slug: Type.String(),
});
export type DepartmentDto = Static<typeof DepartmentDto>;

export const DepartmentsListData = Type.Object({ items: Type.Array(DepartmentDto) });
export type DepartmentsListData = Static<typeof DepartmentsListData>;

export const InvestorSummary = Type.Object({
  id: Type.String(),
  name: Type.String(),
  logoUrl: Nullable(Type.String()),
  website: Nullable(Type.String()),
});
export type InvestorSummary = Static<typeof InvestorSummary>;

export const InvestorsQuery = Type.Object({
  q: Type.Optional(Type.String({ maxLength: 100 })),
});
export type InvestorsQuery = Static<typeof InvestorsQuery>;

export const InvestorsListData = Type.Object({ items: Type.Array(InvestorSummary) });
export type InvestorsListData = Static<typeof InvestorsListData>;

export const HealthData = Type.Object({ status: Type.Literal("ok") });
export type HealthData = Static<typeof HealthData>;
