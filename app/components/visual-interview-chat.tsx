import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUpIcon,
  CheckCircle2Icon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { marked } from "marked";

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Visual Preferences Interview</CardTitle>
        <CardDescription>
          The AI art director asks a few multiple-choice questions to lock in a
          consistent visual style, characters, props, and settings.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {!started ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SparklesIcon />
              </EmptyMedia>
              <EmptyTitle>Ready when you are</EmptyTitle>
              <EmptyDescription>
                Press start to begin the visual style interview.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              onClick={() => send("Let's begin the visual style interview.")}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              {isSending ? "Starting..." : "Start Interview"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </Empty>
        ) : (
          <div className="flex h-full flex-col">
            <MessageScrollerProvider autoScroll>
              <MessageScroller className="flex-1">
                <MessageScrollerViewport>
                  <MessageScrollerContent className="px-4 py-4">
                    {messages.map((m, i) => (
                      <MessageScrollerItem key={i} scrollAnchor={m.role === "user"}>
                        {m.role === "user" ? (
                          <UserMessage content={m.content} />
                        ) : (
                          <AssistantMessage content={m.content} />
                        )}
                      </MessageScrollerItem>
                    ))}

                    {isSending && (
                      <MessageScrollerItem>
                        <ThinkingMessage />
                      </MessageScrollerItem>
                    )}

                    {done && (
                      <MessageScrollerItem>
                        <Marker>
                          <MarkerIcon>
                            <CheckCircle2Icon className="text-emerald-500" />
                          </MarkerIcon>
                          <MarkerContent>
                            Visual details saved. The Visual &amp; Style section is
                            now ready.
                          </MarkerContent>
                        </Marker>
                      </MessageScrollerItem>
                    )}

                    {error && (
                      <MessageScrollerItem>
                        <p className="text-center text-sm text-destructive">
                          {error}
                        </p>
                      </MessageScrollerItem>
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>

            {!done && (
              <div className="shrink-0 bg-background px-3 py-3">
                <div className="flex items-end gap-1 rounded-3xl bg-muted p-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer (e.g. 1.A, 2.B, 3.C)..."
                    disabled={isSending}
                    rows={1}
                    className="min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
                  />
                  <Button
                    size="icon"
                    onClick={() => send(input)}
                    disabled={isSending || !input.trim()}
                    className="shrink-0 rounded-full"
                  >
                    {isSending ? (
                      <Loader2Icon className="animate-spin" data-icon="inline" />
                    ) : (
                      <ArrowUpIcon data-icon="inline" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end" variant="muted" className="rounded-2xl">
          <BubbleContent className="whitespace-pre-wrap text-foreground">
            {content}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <Message align="start">
      <MessageContent>
        <Bubble variant="ghost">
          <BubbleContent
            className="markdown-bubble"
            dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
          />
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function ThinkingMessage() {
  return (
    <Message align="start">
      <MessageContent>
        <Bubble variant="ghost">
          <BubbleContent className="flex items-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            <span>Thinking...</span>
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
