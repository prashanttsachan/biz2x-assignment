import { describe, expect, it, afterEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimitStore,
} from "@/lib/security/rate-limit";
import {
  sanitizeFileName,
  validateChatQuestion,
} from "@/lib/security/input-validation";
import { validateProductionEnv } from "@/lib/config/env";

describe("rate limiting", () => {
  afterEach(() => resetRateLimitStore());

  it("allows requests within limit", () => {
    const result = checkRateLimit("test-key", 3, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests exceeding limit", () => {
    checkRateLimit("block-key", 2, 60000);
    checkRateLimit("block-key", 2, 60000);
    const blocked = checkRateLimit("block-key", 2, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});

describe("input validation", () => {
  it("rejects empty chat questions", () => {
    expect(validateChatQuestion("   ").valid).toBe(false);
  });

  it("accepts valid chat questions", () => {
    expect(validateChatQuestion("What is my net pay?").valid).toBe(true);
  });

  it("rejects overly long chat questions", () => {
    const long = "a".repeat(2001);
    expect(validateChatQuestion(long).valid).toBe(false);
  });

  it("sanitizes dangerous file names", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe(".._.._etc_passwd");
    expect(sanitizeFileName("payslip (1).pdf")).toBe("payslip__1_.pdf");
  });

  it("falls back to default for empty file name", () => {
    expect(sanitizeFileName("!!!")).toBe("upload.bin");
  });
});

describe("environment validation", () => {
  it("returns warnings in production without LLM token", () => {
    const env = process.env as Record<string, string | undefined>;
    const savedNodeEnv = env.NODE_ENV;
    const savedToken = env.LLM_API_TOKEN;

    env.NODE_ENV = "production";
    delete env.LLM_API_TOKEN;

    const result = validateProductionEnv();
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("LLM_API_TOKEN"))).toBe(true);

    if (savedNodeEnv !== undefined) env.NODE_ENV = savedNodeEnv;
    else delete env.NODE_ENV;
    if (savedToken !== undefined) env.LLM_API_TOKEN = savedToken;
  });
});
