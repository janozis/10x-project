import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Podaj poprawny adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email("Podaj poprawny adres email"),
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/[a-z]/, "Przynajmniej jedna mała litera")
      .regex(/[A-Z]/, "Przynajmniej jedna wielka litera")
      .regex(/[0-9]/, "Przynajmniej jedna cyfra")
      .regex(/^\S+$/, "Hasło nie może zawierać spacji"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą się zgadzać",
  });

export type RegisterSchema = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Podaj poprawny adres email"),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/[a-z]/, "Przynajmniej jedna mała litera")
      .regex(/[A-Z]/, "Przynajmniej jedna wielka litera")
      .regex(/[0-9]/, "Przynajmniej jedna cyfra")
      .regex(/^\S+$/, "Hasło nie może zawierać spacji"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą się zgadzać",
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
