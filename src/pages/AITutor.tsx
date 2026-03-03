import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Explain the difference between DFA and NFA",
  "What is the pumping lemma for regular languages?",
  "Explain subset construction algorithm",
  "Why is { aⁿbⁿ } not regular?",
  "What is the Chomsky Normal Form?",
];

const AITutor = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to the AI Tutor! I can help you understand Theory of Computation concepts. Ask me about automata, grammars, Turing machines, or any TOC topic.\n\n*Note: AI integration requires backend setup. Connect Lovable Cloud to enable live AI responses.*",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        role: "assistant",
        content:
          "AI backend not connected yet. Enable Lovable Cloud to get live AI-powered responses for TOC concepts, automata generation, and grammar debugging.",
      },
    ]);
    setInput("");
  };

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="p-2.5 rounded-lg bg-accent/20 text-accent">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground">AI Tutor</h1>
          <p className="text-xs text-muted-foreground">
            Ask questions about Theory of Computation
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "glass-panel text-foreground"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setInput(s);
                }}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
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
          />
          <Button type="submit" size="sm" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default AITutor;
