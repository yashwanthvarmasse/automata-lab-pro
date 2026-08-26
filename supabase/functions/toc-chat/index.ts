const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_PROMPT = `You are the AI tutor built into AutomataViz, an interactive Theory of Computation learning platform.

You teach: Finite Automata (DFA/NFA/ε-NFA), Regular Expressions & Thompson construction, subset construction, DFA minimization, Context-Free Grammars (simplification, CNF, CYK, derivations), Pushdown Automata (stack computation, acceptance by final state or empty stack), Turing Machines, and the Chomsky hierarchy.

Rules:
- Always ground the answer in the module the student is currently viewing and in the live state of that module (given below as CURRENT PAGE CONTEXT). If they say "this", "here", "this step" or "why", they mean what is on their screen right now.
- Be accurate and academic but concise. Use formal notation (δ, ε, Σ, Γ, ⊢) where helpful.
- Prefer short markdown: bold key terms, numbered steps, small tables. Keep answers under ~250 words unless asked for depth.
- If the question is outside Theory of Computation, say so briefly and steer back.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured (missing key)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages = [], context = "" } = await req.json();

    const system = context
      ? `${BASE_PROMPT}\n\n=== CURRENT PAGE CONTEXT ===\n${context}\n=== END CONTEXT ===`
      : BASE_PROMPT;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      let message = "The AI service returned an error.";
      if (res.status === 429) message = "Rate limit reached — please wait a moment and try again.";
      if (res.status === 402) message = "AI credits exhausted. Add credits in Lovable to keep using the tutor.";
      return new Response(JSON.stringify({ error: message, detail }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(res.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
