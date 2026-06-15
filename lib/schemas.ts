import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const accountDetailsSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,}$/, 'Invalid phone number'),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const depositSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  phone: z.string().regex(/^\+?[0-9]{10,}$/, 'Invalid phone number'),
})

export const withdrawalSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  phone: z.string().regex(/^\+?[0-9]{10,}$/, 'Invalid phone number'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type AccountDetailsFormData = z.infer<typeof accountDetailsSchema>
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>
export type DepositFormData = z.infer<typeof depositSchema>
export type WithdrawalFormData = z.infer<typeof withdrawalSchema>
