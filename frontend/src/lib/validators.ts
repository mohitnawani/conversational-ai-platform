import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .max(255, 'Email is too long')
      .email('Enter a valid email address')
      .toLowerCase(),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(24, 'Password must be at most 24 characters') 
      .refine((v) => /[a-z]/.test(v), 'Must contain a lowercase letter')
      .refine((v) => /[A-Z]/.test(v), 'Must contain an uppercase letter')
      .refine((v) => /[0-9]/.test(v), 'Must contain a number')
      .refine((v) => /[^A-Za-z0-9]/.test(v), 'Must contain a special character')
      .refine((v) => !/\s/.test(v), 'Password cannot contain spaces'),

    confirmPassword: z.string().min(1, 'Please confirm your password'),

    Firstname: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name is too long')
   .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
   
    Lastname: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(100, 'Last name is too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>