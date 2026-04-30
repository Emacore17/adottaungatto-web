import { z } from "zod"

export const authProfileTypes = [
  "private",
  "professional",
  "association",
  "shelter",
  "breeder",
] as const

const emailSchema = z.string().trim().email().max(320)

export const authRegisterSchema = z.object({
  email: emailSchema,
  password: z.string().min(10).max(128),
  displayName: z.string().trim().min(2).max(80),
  profileType: z.enum(authProfileTypes).default("private"),
})

export const authLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export const authVerifyEmailSchema = z.object({
  token: z.string().trim().min(32).max(256),
})

export const authRequestPasswordResetSchema = z.object({
  email: emailSchema,
})

export const authResetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: z.string().min(10).max(128),
})

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>

export type AuthLoginInput = z.infer<typeof authLoginSchema>

export type AuthVerifyEmailInput = z.infer<typeof authVerifyEmailSchema>

export type AuthRequestPasswordResetInput = z.infer<
  typeof authRequestPasswordResetSchema
>

export type AuthResetPasswordInput = z.infer<typeof authResetPasswordSchema>
