export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

export function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function validateProductionEnv(): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (isProduction() && !getOptionalEnv("LLM_API_TOKEN")) {
    warnings.push("LLM_API_TOKEN is not set — AI/OCR will use fallback mode.");
  }

  if (isProduction() && !getOptionalEnv("DATA_DIR")) {
    warnings.push(
      "DATA_DIR is not set — using ./data inside container (ensure a volume is mounted)."
    );
  }

  return { ok: true, warnings };
}
