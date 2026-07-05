import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { chatWithSaarthi } from "@/lib/career.functions";
import { AppShell } from "@/components/AppShell";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [
    { title: "Chat with Saarthi · UNTRAP" },
    { name: "description", content: "Chat with Saarthi, your always-on AI career mentor for Indian students." },
    { name: "robots", content: "noindex" },
  ] }),
  component: ChatPage,
});

interface Msg { id: string; role: "user" | "assistant"; content: string }

function ChatPage() {
  const chat = useServerFn(chatWithSaarthi);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("chat_messages").select("id,role,content")
        .eq("user_id", user.id).order("created_at").limit(50);
      setMsgs((data as Msg[]) ?? []);
    })();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, sending]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text }]);
    setSending(true);
    try {
      const { reply } = await chat({ data: { message: text } });
      setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Saarthi couldn't reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <h1 className="sr-only">Chat with Saarthi</h1>
      <div className="mb-4 flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="text-base font-bold">Saarthi AI</p>
          <p className="text-xs text-muted-foreground">Your career mentor · always here</p>
        </div>
      </div>

      <div className="space-y-3 pb-4">
        {msgs.length === 0 && (
          <div className="rounded-2xl bg-primary/5 p-4 text-sm text-muted-foreground">
            Hey 👋 I'm Saarthi. Ask me anything — confusion about subjects, dealing with family pressure, what to learn next, anything.
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm",
              m.role === "user"
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md border border-border bg-card text-foreground")}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin" /> Saarthi is thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="fixed inset-x-0 bottom-[68px] z-20 mx-auto max-w-2xl px-5">
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-pop">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
            placeholder="Ask Saarthi anything…"
            rows={1}
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
          />
          <button type="submit" disabled={sending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
