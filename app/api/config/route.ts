import { isLlmConfigured } from "@/lib/ai/llm-client";

export async function GET() {
  return Response.json({
    llmConfigured: isLlmConfigured(),
  });
}
