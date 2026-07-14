import { Bot, Check, Copy, RefreshCw, User } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "@/types";
import { MarkdownRenderer } from "./markdown-renderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessage;
  onRegenerate?: () => void;
  isLast?: boolean;
}

export function MessageBubble({ message, onRegenerate, isLast }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "animate-fade-in-up group flex w-full gap-3 sm:gap-4",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full",
          isUser ? "bg-secondary text-secondary-foreground" : "gradient-brand-bg text-primary-foreground shadow-glow",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card text-card-foreground border rounded-bl-md",
          )}
        >
          {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <MarkdownRenderer content={message.content} />}
        </div>

        <div className="text-muted-foreground flex items-center gap-2 px-1 text-[11px] opacity-0 transition-opacity group-hover:opacity-100">
          <span>{time}</span>
          <button
            onClick={copy}
            className="hover:text-foreground inline-flex items-center gap-1"
            aria-label="Copy message"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {!isUser && isLast && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="hover:text-foreground inline-flex items-center gap-1"
              aria-label="Regenerate response"
            >
              <RefreshCw className="h-3 w-3" /> Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
