export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" aria-label="Assistant is typing">
      <span className="bg-muted-foreground/70 h-2 w-2 animate-pulse-dot rounded-full" />
      <span
        className="bg-muted-foreground/70 h-2 w-2 animate-pulse-dot rounded-full"
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className="bg-muted-foreground/70 h-2 w-2 animate-pulse-dot rounded-full"
        style={{ animationDelay: "0.4s" }}
      />
      <span className="text-muted-foreground ml-2 text-xs">Thinking…</span>
    </div>
  );
}
