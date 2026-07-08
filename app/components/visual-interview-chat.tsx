import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardFooter,
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
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { ArrowUpIcon, SparklesIcon, CheckCircle2Icon } from "lucide-react";
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

  return (
    <Card className="h-full gap-0">
      <CardHeader className="gap-1 border-b">
        <CardTitle>Visual Preferences Interview</CardTitle>
        <CardDescription>
          The AI art director asks a few multiple-choice questions to lock in a
          consistent visual style, characters, props, and settings.
        </CardDescription>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
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
          </Empty>
        ) : (
          <MessageScrollerProvider>
            <MessageScroller className="h-full">
              <MessageScrollerViewport>
                <MessageScrollerContent aria-busy={isSending} className="gap-3 p-4">
                  {messages.map((m, i) => (
                    <MessageScrollerItem key={i} scrollAnchor={m.role === "user"}>
                      {m.role === "user" ? (
                        <div className="max-w-[85%] self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap ml-auto">
                          {m.content}
                        </div>
                      ) : (
                        <div
                          className="markdown-bubble max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-sm"
                          dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }}
                        />
                      )}
                    </MessageScrollerItem>
                  ))}
                  {isSending && (
                    <MessageScrollerItem>
                      <div className="self-start rounded-lg bg-muted px-3 py-2 w-fit">
                        <Spinner className="h-4 w-4" />
                      </div>
                    </MessageScrollerItem>
                  )}
                  {done && (
                    <MessageScrollerItem>
                      <div className="flex items-center gap-2 self-center mx-auto w-fit rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        <CheckCircle2Icon className="h-4 w-4" />
                        Visual details saved. The Visual &amp; Style section is now ready.
                      </div>
                    </MessageScrollerItem>
                  )}
                  {error && (
                    <MessageScrollerItem>
                      <p className="self-center text-center text-destructive text-sm">{error}</p>
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </CardContent>

      {started && !done && (
        <CardFooter className="p-3">
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
                <ArrowUpIcon className="h-4 w-4" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </CardFooter>
      )}
    </Card>
  );
}
