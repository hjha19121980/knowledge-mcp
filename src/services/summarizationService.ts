import { config } from "../utils/config.js";

export class SummarizationService {
  async summarize(content: string): Promise<string> {
    if (config.EMBEDDING_PROVIDER === "azure" &&
        (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_API_KEY || !config.AZURE_OPENAI_CHAT_DEPLOYMENT)) {
      throw new Error("Azure endpoint, API key, and chat deployment are required to summarize documents");
    }
    const prompt = `Summarize the following organizational knowledge document concisely using these exact headings: Purpose, Key Requirements, Important Guidelines, Risks. Do not invent information; state when a heading is not covered.\n\n${content.slice(0, 80_000)}`;
    const azure = config.EMBEDDING_PROVIDER === "azure";
    const endpoint = azure
      ? `${config.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(config.AZURE_OPENAI_CHAT_DEPLOYMENT!)}/chat/completions?api-version=${encodeURIComponent(config.AZURE_OPENAI_API_VERSION)}`
      : "https://api.openai.com/v1/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: azure
        ? { "api-key": config.AZURE_OPENAI_API_KEY!, "content-type": "application/json" }
        : { authorization: `Bearer ${config.OPENAI_API_KEY!}`, "content-type": "application/json" },
      body: JSON.stringify({
        ...(azure ? {} : { model: config.OPENAI_CHAT_MODEL }),
        messages: [
          { role: "system", content: "You are an enterprise knowledge assistant. Produce factual, concise summaries." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 700
      }),
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`Summarization provider returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const summary = payload.choices?.[0]?.message?.content;
    if (typeof summary !== "string" || !summary.trim()) throw new Error("Summarization provider returned an empty summary");
    return summary.trim();
  }
}

export const summarizationService = new SummarizationService();
