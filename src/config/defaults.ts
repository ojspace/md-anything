import type { ConvertOptions } from "../core/types";

export interface AppConfig {
  outputDir: string;
  options: ConvertOptions;
}

export const DEFAULT_CONFIG: AppConfig = {
  outputDir: "./output",
  options: {
    mode: "balanced",
    summary: true,
    frontmatter: true,
    timestamps: true,
    speakers: false,
    tables: true,
  },
};
