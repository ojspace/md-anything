import { z } from "zod";
import type { ConvertRequest } from "../core/types";

export const ConvertOptionsSchema = z.object({
  mode: z.enum(["fast", "balanced", "thorough"]).default("balanced"),
  summary: z.boolean().default(true),
  frontmatter: z.boolean().default(true),
  timestamps: z.boolean().default(true),
  speakers: z.boolean().default(false),
  tables: z.boolean().default(true),
});

export const ConvertRequestSchema = z.object({
  input: z.string().min(1),
  options: ConvertOptionsSchema.default({}),
});

export type { ConvertRequest };
