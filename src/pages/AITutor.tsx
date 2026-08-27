import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Square, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { streamTutor, type ChatMessage } from "@/lib/ai-service";
import { usePageContext } from "@/lib/page-context";

const suggestions = [
  "Explain the difference between DFA and NFA",
  "What is the pumping lemma for regular languages?",
  "Explain subset construction algorithm",
  "Why is { aⁿbⁿ } not regular?",
  "What is the Chomsky Normal Form?",
];

const WELCOME =
  "Welcome to the AI Tutor! Ask me about finite automata, regular expressions, grammars, pushdown automata, Turing machines or the Chomsky hierarchy — I also know which module you are on.";

const AITutor = () => {
  const { context } = usePageContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isStreaming) return;
      setInput("");

      const next: ChatMessage[] = [...messages, { role: "user", content: msg }];
      setMessages([...next, { role: "assistant", content: "" }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let acc = "";
        for await (const token of streamTutor(next, context, controller.signal)) {
          acc += token;
          setMessages([...next, { role: "assistant", content: acc }]);
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setMessages([
          ...next,
          { role: "assistant", content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong."}` },
        ]);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [input, messages, context, isStreaming]
  );

  return (
    <motion.div className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent/20 text-accent">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">AI Tutor</h1>
            <p className="text-xs text-muted-foreground">Ask questions about Theory of Computation</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="glass-panel px-4 py-3 text-sm text-foreground max-w-[75%]">{WELCOME}</div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                  : "glass-panel text-foreground prose prose-sm dark:prose-invert max-w-none"
              }`}
            >
              {msg.role === "user" ? (
                msg.content
              ) : msg.content ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                <span className="text-muted-foreground">thinking…</span>
              )}
            </div>
          </motion.div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about TOC concepts..."
            className="flex-1 font-mono text-sm"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => abortRef.current?.abort()}>
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="submit" size="sm" disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          )}
        </form>
      </div>
    </motion.div>
  );
};

export default AITutor;
