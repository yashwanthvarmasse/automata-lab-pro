import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Sparkles, BookOpen, HelpCircle, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { streamTutor, type ChatMessage } from "@/lib/ai-service";
import { usePageContext } from "@/lib/page-context";

const quickActions = [
  { label: "Explain this page", icon: BookOpen, prompt: "Explain what this module does and what I'm looking at right now." },
  { label: "Explain this step", icon: HelpCircle, prompt: "Explain the current step / state shown on screen in detail." },
  { label: "Show theory", icon: Sparkles, prompt: "Explain the underlying theory for this topic with a small example." },
];

const AIAssistantPanel = () => {
  const { context, moduleName } = usePageContext();
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
      if (!text) setInput("");

      const newMessages: ChatMessage[] = [...messages, { role: "user", content: msg }];
      setMessages([...newMessages, { role: "assistant", content: "" }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let acc = "";
        for await (const token of streamTutor(newMessages, context, controller.signal)) {
          acc += token;
          setMessages([...newMessages, { role: "assistant", content: acc }]);
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setMessages([
          ...newMessages,
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
    <div className="flex flex-col h-full border-l border-border bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-foreground">AI Assistant</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="px-3 py-1.5 border-b border-border bg-muted/30">
        <p className="text-[10px] text-muted-foreground truncate">
          Context: <span className="text-primary font-medium">{moduleName}</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">AI Tutor</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                I know you're on <span className="text-primary">{moduleName}</span> — ask away.
              </p>
            </div>
            <div className="w-full space-y-1.5 mt-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSend(action.prompt)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
                >
                  <action.icon className="w-3 h-3 flex-shrink-0" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-xs ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="ai-prose text-xs leading-relaxed">
                  <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="flex gap-1 px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length > 0 && (
        <div className="px-3 py-1.5 flex gap-1 overflow-x-auto">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSend(action.prompt)}
              disabled={isStreaming}
              className="flex-shrink-0 px-2 py-1 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-1.5"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${moduleName}...`}
            className="flex-1 h-8 text-xs"
          />
          {isStreaming ? (
            <Button type="button" size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => abortRef.current?.abort()}>
              <Square className="w-3 h-3" />
            </Button>
          ) : (
            <Button type="submit" size="sm" className="h-8 w-8 p-0" disabled={!input.trim()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};

export default AIAssistantPanel;
