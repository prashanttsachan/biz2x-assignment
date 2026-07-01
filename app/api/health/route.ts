import { validateProductionEnv } from "@/lib/config/env";
import { isLlmConfigured } from "@/lib/ai/llm-client";

export async function GET() {
  const envCheck = validateProductionEnv();

  return Response.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      llmConfigured: isLlmConfigured(),
      dataDir: process.env.DATA_DIR ?? "./data",
      warnings: envCheck.warnings,
    },
    { status: 200 }
  );
}
