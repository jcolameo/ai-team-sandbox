// Minimal client for the Abacus RouteLLM API (OpenAI-compatible chat completions).
// Used by the planner and, later, the verifier. No dependencies.
export const DEFAULT_BASE_URL = 'https://routellm.abacus.ai/v1';

export async function chat({
  model,
  system,
  user,
  apiKey,
  maxTokens = 1500,
  baseUrl = DEFAULT_BASE_URL,
  timeoutMs = 90_000,
  fetchImpl = fetch,
}) {
  if (!apiKey) {
    throw new Error('ABACUS_API_KEY is not set');
  }
  const res = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Abacus API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('Abacus API returned no content');
  }
  return { content, model: data.model ?? model, usage: data.usage ?? null };
}
