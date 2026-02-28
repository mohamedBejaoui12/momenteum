import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Minimum 8 characters"),
});
export type AuthInput = z.infer<typeof authSchema>;
