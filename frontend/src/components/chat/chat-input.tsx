import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (msg: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isLoading, disabled }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        className={cn(
          "bg-card border-border relative flex items-end gap-2 rounded-2xl border p-2 shadow-elegant",
          "focus-within:ring-ring/30 focus-within:border-ring/50 focus-within:ring-4 transition",
        )}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          disabled={disabled}
          placeholder="Ask Aria to book, reschedule, or check your calendar…"
          className="max-h-[200px] min-h-[40px] w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        {isLoading ? (
          <Button size="icon" variant="secondary" onClick={onStop} aria-label="Stop">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={submit}
            disabled={!value.trim() || disabled}
            aria-label="Send message"
            className="shadow-glow"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mt-2 text-center text-xs">
        Press <kbd className="bg-muted rounded px-1.5 py-0.5">Enter</kbd> to send ·{" "}
        <kbd className="bg-muted rounded px-1.5 py-0.5">Shift</kbd> +{" "}
        <kbd className="bg-muted rounded px-1.5 py-0.5">Enter</kbd> for newline
      </p>
    </div>
  );
}
