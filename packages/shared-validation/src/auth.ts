import { z } from 'zod';

export const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;
