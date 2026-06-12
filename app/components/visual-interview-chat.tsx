import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { SendIcon, SparklesIcon, CheckCircle2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

type InterviewResponse =
  | { message: string }
  | { done: true }
  | { error: string };

export default function VisualInterviewChat({
  pictureBookId,
}: {
  pictureBookId: string;
}) {
  const fetcher = useFetcher<InterviewResponse>();
  const revalidator = useRevalidator();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastDataRef = useRef<InterviewResponse | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const isSending = fetcher.state !== "idle";
  const started = messages.length > 0;

  // Process each fetcher response exactly once (fetcher.data is a fresh object
  // per response, so identity comparison dedupes re-renders).
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (lastDataRef.current === fetcher.data) return;
    lastDataRef.current = fetcher.data;

    const data = fetcher.data;
    if ("error" in data) {
      setError(data.error);
    } else if ("done" in data) {
      setDone(true);
      revalidator.revalidate();
    } else if ("message" in data) {
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, isSending]);

  const send = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    fetcher.submit(
      { messages: JSON.stringify(next) },
      { method: "POST", action: `/admin/picture-books/${pictureBookId}/interview` }
    );
  };

  // Empty state with prompt starter.
  if (!started) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-full bg-primary/10 p-3">
          <SparklesIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h4 className="text-base font-semibold">Visual Preferences Interview</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            The AI art director will ask a few multiple-choice questions to lock
            in a consistent visual style, characters, props, and settings for
            your picture book.
          </p>
        </div>
        <Button
          onClick={() => send("Let's begin the visual style interview.")}
          disabled={isSending}
        >
          {isSending ? (
            <>
              <Spinner data-icon="inline-start" />
              Starting...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4 mr-1" />
              Start Interview
            </>
          )}
        </Button>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted"
              )}
            >
              {m.content}
            </div>
          ))}
          {isSending && (
            <div className="self-start rounded-lg bg-muted px-3 py-2">
              <Spinner className="h-4 w-4" />
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 self-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2Icon className="h-4 w-4" />
              Visual details saved. The Visual &amp; Style section is now ready.
            </div>
          )}
          {error && <p className="self-center text-destructive text-sm">{error}</p>}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {!done && (
        <div className="border-t p-3">
          <InputGroup>
            <InputGroupTextarea
              placeholder="Type your answer (e.g. 1.A, 2.B, 3.C)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              disabled={isSending}
              rows={2}
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton
                className="ml-auto"
                variant="default"
                size="icon-xs"
                onClick={() => send(input)}
                disabled={isSending || !input.trim()}
                aria-label="Send"
              >
                <SendIcon className="h-4 w-4" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      )}
    </div>
  );
}
