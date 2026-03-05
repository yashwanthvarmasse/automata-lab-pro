// Ollama AI Service - connects to local Ollama instance

const OLLAMA_BASE = "http://localhost:11434";

export interface OllamaModel {
  name: string;
  label: string;
}

export const AVAILABLE_MODELS: OllamaModel[] = [
  { name: "llama3", label: "LLaMA 3" },
  { name: "mistral", label: "Mistral" },
  { name: "codellama", label: "Code LLaMA" },
  { name: "phi", label: "Phi" },
];

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `You are an expert Automata Theory tutor integrated into AutomataViz, an interactive Theory of Computation learning platform. You help students understand:
- Finite Automata (DFA, NFA, ε-NFA)
- Regular Expressions and Thompson Construction
- Context-Free Grammars, CNF, CYK parsing
- Pushdown Automata
- Turing Machines
- Chomsky Hierarchy

Keep answers clear, concise, and academic. Use formal notation when appropriate. If the user provides context about the current module they're viewing, reference it in your explanations.`;

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: any) => m.name);
  } catch {
    return [];
  }
}

export async function* streamChat(
  model: string,
  messages: ChatMessage[],
  context?: string
): AsyncGenerator<string, void, unknown> {
  const systemMsg: ChatMessage = {
    role: "system",
    content: context
      ? `${SYSTEM_PROMPT}\n\nCurrent module context:\n${context}`
      : SYSTEM_PROMPT,
  };

  const prompt = [systemMsg, ...messages]
    .map((m) => {
      if (m.role === "system") return `System: ${m.content}`;
      if (m.role === "user") return `User: ${m.content}`;
      return `Assistant: ${m.content}`;
    })
    .join("\n\n");

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 512,
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama returned ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.response) yield json.response;
        if (json.done) return;
      } catch {}
    }
  }
}
