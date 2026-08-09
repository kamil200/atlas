import { type Static, type TLiteral, type TSchema, type TUnion, Type } from "@sinclair/typebox";

type StringEnumSchema<T extends Record<string, string>> = TUnion<TLiteral<T[keyof T]>[]>;

/*
  Builds a schema from one of the enum objects in enums.ts. It is a union of
  literals rather than Type.Unsafe with an `enum` list because ajv, TypeBox's
  own Value.Check, and fast-json-stringify all understand a union — an Unsafe
  schema validates at runtime in Fastify but throws in TypeBox's checker.
*/
export function StringEnum<T extends Record<string, string>>(values: T): StringEnumSchema<T> {
  // Object.values widens to string[], so the literal types are restored here.
  return Type.Union(
    Object.values(values).map((value) => Type.Literal(value)),
  ) as StringEnumSchema<T>;
}

/* Most DTO fields are optional in the database, so this comes up everywhere. */
export function Nullable<T extends TSchema>(schema: T) {
  return Type.Union([schema, Type.Null()]);
}

/* Dates cross the wire as ISO-8601 strings; nothing sends a Date object. */
export const IsoDate = Type.String();

export const ApiError = Type.Object({
  code: Type.String(),
  message: Type.String(),
});
export type ApiError = Static<typeof ApiError>;

export const ErrorResponse = Type.Object({
  success: Type.Literal(false),
  error: ApiError,
});
export type ErrorResponse = Static<typeof ErrorResponse>;

/* Every successful response is wrapped, so routes declare SuccessResponse(X). */
export function SuccessResponse<T extends TSchema>(data: T) {
  return Type.Object({
    success: Type.Literal(true),
    data,
  });
}

export const EmptyData = Type.Object({});

export const PageQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
});
export type PageQuery = Static<typeof PageQuery>;
