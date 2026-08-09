import { type Static, Type } from "@sinclair/typebox";
import { IsoDate, Nullable, StringEnum } from "./common";
import { UserRole } from "./enums";

export const UserDto = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  avatarUrl: Nullable(Type.String()),
  role: StringEnum(UserRole),
  createdAt: IsoDate,
});
export type UserDto = Static<typeof UserDto>;

export const RegisterBody = Type.Object({
  email: Type.String({ format: "email", minLength: 3, maxLength: 254 }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  name: Type.String({ minLength: 1, maxLength: 80 }),
});
export type RegisterBody = Static<typeof RegisterBody>;

export const LoginBody = Type.Object({
  email: Type.String({ minLength: 3, maxLength: 254 }),
  password: Type.String({ minLength: 1, maxLength: 128 }),
});
export type LoginBody = Static<typeof LoginBody>;

export const AuthUserData = Type.Object({ user: UserDto });
export type AuthUserData = Static<typeof AuthUserData>;
