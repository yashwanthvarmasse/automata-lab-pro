import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Settings, Wifi, WifiOff, Sparkles, BookOpen, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import {
  checkOllamaConnection,
  getAvailableModels,
  streamChat,
  AVAILABLE_MODELS,
  type ChatMessage,
} from "@/lib/ollama-service";

interface AIAssistantPanelProps {
  moduleContext?: string;
}

const quickActions = [
  { label: "Explain this step", icon: BookOpen, prompt: "Explain the current step in detail." },
  { label: "Why this transition?", icon: HelpCircle, prompt: "Why does this transition exist? Explain the logic." },
  { label: "Show theory", icon: Sparkles, prompt: "Explain the underlying theory for the current topic." },
];

const AIAssistantPanel = ({ moduleContext }: AIAssistantPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama3");
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const check = async () => {
      const ok = await checkOllamaConnection();
      setIsConnected(ok);
      if (ok) {
        const models = await getAvailableModels();
        setInstalledModels(models);
        if (models.length > 0 && !models.includes(selectedModel)) {
          setSelectedModel(models[0]);
        }
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;
    if (!text) setInput("");

    const userMsg: ChatMessage = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      let accumulated = "";
      for await (const token of streamChat(selectedModel, newMessages, moduleContext)) {
        accumulated += token;
        setMessages([...newMessages, { role: "assistant", content: accumulated }]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Connection failed";
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `⚠️ ${errorMsg}\n\nMake sure Ollama is running at \`http://localhost:11434\` and you have the \`${selectedModel}\` model pulled.\n\n\`\`\`bash\nollama pull ${selectedModel}\n\`\`\``,
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, selectedModel, moduleContext, isStreaming]);

  return (
    <div className="flex flex-col h-full border-l border-border bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Assistant</span>
          {isConnected !== null && (
            <span className={`flex items-center gap-1 text-[10px] ${isConnected ? "text-success" : "text-muted-foreground"}`}>
              {isConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="px-3 py-2 border-b border-border space-y-2 bg-muted/30">
          <label className="text-[10px] font-medium text-muted-foreground">Model</label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(installedModels.length > 0 ? installedModels : AVAILABLE_MODELS.map(m => m.name)).map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {AVAILABLE_MODELS.find(a => a.name === m)?.label || m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            Connects to Ollama at localhost:11434
          </p>
        </div>
      )}

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
                Ask about automata theory concepts
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
                  <ArrowRight className="w-2.5 h-2.5 ml-auto opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-xs ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="ai-prose text-xs leading-relaxed">
                  <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
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

      {/* Quick actions when in conversation */}
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
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-1.5"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 h-8 text-xs"
            disabled={isStreaming}
          />
          <Button type="submit" size="sm" className="h-8 w-8 p-0" disabled={!input.trim() || isStreaming}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistantPanel;
