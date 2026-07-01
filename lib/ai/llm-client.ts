const LLM_WRAPPER_URL =
  process.env.LLM_WRAPPER_URL ??
  "https://llm-wrapper-741152993481.asia-south1.run.app";

export interface LlmQueryOptions {
  prompt: string;
  pdfBase64?: string;
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  metadata?: Record<string, string>;
}

export interface LlmResponse {
  text: string;
  fromFallback: boolean;
}

export async function queryLlm(
  options: LlmQueryOptions
): Promise<LlmResponse> {
  const token = process.env.LLM_API_TOKEN?.trim();

  if (!token) {
    return {
      text: "",
      fromFallback: true,
    };
  }

  try {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
      metadata: {
        client: "finwell-tax-agent",
        ...options.metadata,
      },
    };

    if (options.pdfBase64) {
      body.pdfBase64 = options.pdfBase64;
    }
    if (options.imageBase64) {
      body.imageBase64 = options.imageBase64;
      body.imageMediaType = options.imageMediaType ?? "image/png";
    }

    const response = await fetch(`${LLM_WRAPPER_URL}/llm/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("LLM wrapper error:", response.status, await response.text());
      return { text: "", fromFallback: true };
    }

    const data = (await response.json()) as {
      response?: string;
      text?: string;
      answer?: string;
      result?: string;
    };

    const text =
      data.response ?? data.text ?? data.answer ?? data.result ?? "";

    return { text, fromFallback: false };
  } catch (error) {
    console.error("LLM query failed:", error);
    return { text: "", fromFallback: true };
  }
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_TOKEN?.trim());
}
