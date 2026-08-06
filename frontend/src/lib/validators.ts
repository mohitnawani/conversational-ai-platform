import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(255, 'Name is too long'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((v) => /[a-z]/.test(v), 'Must contain a lowercase letter')
      .refine((v) => /[A-Z]/.test(v), 'Must contain an uppercase letter')
      .refine((v) => /[0-9]/.test(v), 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>