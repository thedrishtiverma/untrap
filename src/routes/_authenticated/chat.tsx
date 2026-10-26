import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { chatWithSaarthi } from "@/lib/career.functions";
import { AppShell } from "@/components/AppShell";
import { BreakMark } from "@/components/BreakMark";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
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

const STARTERS = [
  "Which stream should I pick after Class 10?",
  "My family wants engineering, but I love design",
  "What skills should I build this month?",
  "I feel lost about my future — help me start",
] as const;

function ChatPage() {
  const chat = useServerFn(chatWithSaarthi);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("chat_messages").select("id,role,content")
        .eq("user_id", user.id).order("created_at").limit(50);
      setMsgs((data as Msg[]) ?? []);
    })();
  }, []);

  async function deliver(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
    try {
      const { reply } = await chat({ data: { message: trimmed } });
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

      <div className="flex h-[calc(100svh-14.5rem)] min-h-[560px] flex-col md:h-[calc(100svh-9.5rem)]">
        {/* Saarthi identity */}
        <header className="shrink-0 rounded-3xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-inner">
              <BreakMark size={30} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Your career mentor
              </p>
              <div className="mt-0.5 flex items-center gap-2.5">
                <h2 className="font-serif text-xl font-semibold leading-none">Saarthi</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Online
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Transcript */}
        <Conversation className="mt-3 min-h-0 flex-1 overflow-hidden rounded-3xl border border-border bg-card/40 shadow-card">
          <ConversationContent className="space-y-5 px-4 py-5 sm:px-5">
            {msgs.length === 0 && !sending && (
              <ConversationEmptyState className="h-full justify-center py-8">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-accent text-accent-foreground shadow-card">
                    <BreakMark size={34} animated />
                  </div>
                  <h2 className="font-serif text-2xl font-semibold tracking-tight">
                    Hey, I&apos;m Saarthi 👋
                  </h2>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                    Confusion about subjects, family pressure, what to learn next —
                    ask me anything. I answer with your journey in mind.
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => deliver(s)}
                        className="rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground/75 transition hover:border-foreground/20 hover:bg-foreground/5 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </ConversationEmptyState>
            )}

            {msgs.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent
                  className={cn(
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary! px-4 py-3 text-primary-foreground!"
                      : "max-w-full",
                  )}
                >
                  {m.role === "user" ? (
                    m.content
                  ) : (
                    <MessageResponse className="text-[15px] leading-relaxed">
                      {m.content}
                    </MessageResponse>
                  )}
                </MessageContent>
              </Message>
            ))}

            {sending && (
              <Message from="assistant">
                <MessageContent className="text-sm text-muted-foreground">
                  <Shimmer duration={1.6}>Saarthi is thinking…</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton variant="outline" />
        </Conversation>

        {/* Composer */}
        <div className="mt-3 shrink-0">
          <PromptInput
            onSubmit={async ({ text }) => deliver(text)}
            className="rounded-3xl border border-border bg-card shadow-pop"
          >
            <PromptInputTextarea
              placeholder="Ask Saarthi anything…"
              className="min-h-11 px-4 pt-3.5 text-sm"
            />
            <PromptInputFooter className="items-center justify-between px-3 pb-2.5 pt-1">
              <span className="text-[11px] text-muted-foreground">
                <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
                <span className="sm:hidden">Saarthi gives guidance, not verdicts</span>
              </span>
              <PromptInputSubmit
                status={sending ? "submitted" : "ready"}
                disabled={sending}
                className="rounded-2xl"
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </AppShell>
  );
}
