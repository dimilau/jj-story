import { useState } from "react";
import { redirect, useFetcher } from "react-router";
import type { Route } from "./+types/admin.picture-books";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { stories, pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import AdminLayout from "../components/admin-layout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { PlusIcon, BookOpenIcon } from "lucide-react";
import { env } from "cloudflare:workers";
import OpenAI from "openai";
import { Link } from "react-router";

type Scene = {
  scene_id: string;
  scene_content: string;
};

const SYSTEM_PROMPT = `You are a helpful assistant for breaking down the story into scenes for picture book illustration. A scene is a group of one or more consecutive sentences that would naturally appear together in a single illustration. User will provide a story, and your task is to break down the story into scenes and return the results in JSON format: a JSON array of scenes, each scene is an object with "scene_id" and "scene_content". No explanation is needed, only return the JSON array.`;

export function meta() {
  return [{ title: "Picture Books" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/dashboard");

  const db = getDb();
  const [allStories, allPictureBooks] = await Promise.all([
    db.select({ id: stories.id, title: stories.title }).from(stories).orderBy(stories.title),
    db
      .select({
        id: pictureBooks.id,
        title: pictureBooks.title,
        storyId: pictureBooks.storyId,
        createdAt: pictureBooks.createdAt,
      })
      .from(pictureBooks)
      .orderBy(pictureBooks.createdAt),
  ]);

  return { user, allStories, allPictureBooks };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") throw redirect("/login");

  const formData = await request.formData();
  const storyId = formData.get("storyId") as string;
  if (!storyId) return { error: "Missing story ID" };

  const db = getDb();
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  if (!story) return { error: "Story not found" };

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: env.DEEPSEEK_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: story.content },
    ],
    stream: false,
  });

  const responseText = completion.choices[0].message.content ?? "[]";
  const cleanJson = responseText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let scenes: Scene[];
  try {
    scenes = JSON.parse(cleanJson);
  } catch {
    return { error: "Failed to parse scenes from AI response" };
  }

  const pictureBookId = crypto.randomUUID();
  const r2Key = `picture-books/${pictureBookId}/scenes.json`;

  await env.BUCKET.put(r2Key, JSON.stringify(scenes));

  await db.insert(pictureBooks).values({
    id: pictureBookId,
    storyId: story.id,
    title: story.title,
    r2Key,
  });

  throw redirect(`/admin/picture-books/${pictureBookId}/edit`);
}

export default function AdminPictureBooks({ loaderData }: Route.ComponentProps) {
  const { user, allStories, allPictureBooks } = loaderData;
  const fetcher = useFetcher<{ error?: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<{ id: string; title: string } | null>(null);

  const isGenerating = fetcher.state !== "idle";

  return (
    <AdminLayout userEmail={user.email}>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Picture Books</h2>
          <Button
            size="sm"
            onClick={() => {
              setSelectedStory(null);
              setDialogOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New Picture Book
          </Button>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!isGenerating) setDialogOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Picture Book</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1">
                <Combobox
                  items={allStories}
                  itemToStringValue={(s) => s.title}
                  value={selectedStory?.title ?? null}
                  onValueChange={(val) => {
                    const story = allStories.find((s) => s.title === val);
                    setSelectedStory(story ?? null);
                  }}
                >
                  <ComboboxInput
                    placeholder="Select your story..."
                    showClear={!!selectedStory}
                    className="w-full"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No stories found.</ComboboxEmpty>
                    <ComboboxList>
                      {(s: { id: string; title: string }) => (
                        <ComboboxItem key={s.id} value={s.title}>
                          {s.title}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <Button
                disabled={!selectedStory || isGenerating}
                onClick={() => {
                  if (selectedStory) {
                    fetcher.submit(
                      { storyId: selectedStory.id },
                      { method: "POST" }
                    );
                  }
                }}
              >
                {isGenerating ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
            {fetcher.data?.error && (
              <p className="text-destructive text-sm mt-2">{fetcher.data.error}</p>
            )}
          </DialogContent>
        </Dialog>

        {allPictureBooks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No picture books yet. Select a story to begin creating one.
          </p>
        ) : (
          <div className="space-y-2">
            {allPictureBooks.map((pb) => (
              <Link
                key={pb.id}
                to={`/admin/picture-books/${pb.id}/edit`}
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <BookOpenIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{pb.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {pb.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
