import { redirect, useFetcher } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/admin.picture-books.$id.edit";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { stories, pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import AdminLayout from "../components/admin-layout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScissorsIcon } from "lucide-react";
import { env } from "cloudflare:workers";

type Scene = {
  scene_id: string;
  scene_content: string;
};

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data ? `Picture Book: ${data.pictureBook.title}` : "Edit Picture Book" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/dashboard");

  const pictureBookId = params.id;
  if (!pictureBookId) throw redirect("/admin/picture-books");

  const db = getDb();
  const [pictureBook] = await db.select().from(pictureBooks).where(eq(pictureBooks.id, pictureBookId));
  if (!pictureBook) throw redirect("/admin/picture-books");

  const [story] = await db.select().from(stories).where(eq(stories.id, pictureBook.storyId));
  if (!story) throw redirect("/admin/picture-books");

  const r2Object = await env.BUCKET.get(pictureBook.r2Key);
  const scenesJson = r2Object ? await r2Object.text() : "[]";
  const scenes: Scene[] = JSON.parse(scenesJson);

  return { user, story, pictureBook, scenes };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") throw redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save") {
    const scenesJson = formData.get("scenes") as string;
    const db = getDb();
    const [pictureBook] = await db.select().from(pictureBooks).where(eq(pictureBooks.id, params.id!));
    if (!pictureBook) return { error: "Picture book not found" };

    await env.BUCKET.put(pictureBook.r2Key, scenesJson);
    return { success: true };
  }

  return { error: "Unknown action" };
}

function SceneContent({
  content,
  onSplit,
}: {
  content: string;
  onSplit: (splitPos: number) => void;
}) {
  const periodPositions: number[] = [];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === ".") periodPositions.push(i);
  }

  if (periodPositions.length <= 1) {
    return <span className="text-sm leading-relaxed">{content}</span>;
  }

  const splitPoints = periodPositions.slice(0, -1);
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;

  for (const periodIdx of splitPoints) {
    parts.push(
      <span key={`t-${periodIdx}`}>{content.slice(lastIdx, periodIdx + 1)}</span>
    );
    parts.push(
      <button
        key={`s-${periodIdx}`}
        type="button"
        onClick={() => onSplit(periodIdx + 1)}
        className="inline-flex items-center mx-1 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        title="Split here"
      >
        <ScissorsIcon className="h-3 w-3" />
      </button>
    );
    lastIdx = periodIdx + 1;
  }

  parts.push(<span key="t-end">{content.slice(lastIdx)}</span>);

  return <p className="text-sm leading-relaxed">{parts}</p>;
}

export default function EditPictureBook({ loaderData }: Route.ComponentProps) {
  const { user, story, pictureBook, scenes: initialScenes } = loaderData;
  const saveFetcher = useFetcher<{ success?: boolean; error?: string }>();

  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [originalScenes] = useState<Scene[]>(initialScenes);
  const [history, setHistory] = useState<Scene[][]>([]);

  const saveHistory = (current: Scene[]) => {
    setHistory((prev) => [...prev, current]);
  };

  const renumber = (arr: Scene[]): Scene[] =>
    arr.map((s, i) => ({ ...s, scene_id: String(i + 1) }));

  const handleSplit = (sceneIndex: number, splitPos: number) => {
    saveHistory(scenes);
    const scene = scenes[sceneIndex];
    const part1 = scene.scene_content.slice(0, splitPos).trim();
    const part2 = scene.scene_content.slice(splitPos).trim();
    const newScenes = [...scenes];
    newScenes.splice(sceneIndex, 1,
      { scene_id: "", scene_content: part1 },
      { scene_id: "", scene_content: part2 }
    );
    setScenes(renumber(newScenes));
  };

  const handleMergeWithPrevious = (index: number) => {
    if (index < 1) return;
    saveHistory(scenes);
    const newScenes = [...scenes];
    const merged: Scene = {
      scene_id: "",
      scene_content: `${newScenes[index - 1].scene_content} ${newScenes[index].scene_content}`,
    };
    newScenes.splice(index - 1, 2, merged);
    setScenes(renumber(newScenes));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setScenes(prev);
  };

  const handleReset = () => {
    setHistory([]);
    setScenes(originalScenes);
  };

  const handleSave = () => {
    saveFetcher.submit(
      { intent: "save", scenes: JSON.stringify(scenes) },
      { method: "POST" }
    );
  };

  const isSaving = saveFetcher.state !== "idle";

  return (
    <AdminLayout userEmail={user.email}>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{story.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">Picture Book Editor</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Scenes</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={history.length === 0}
              >
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={scenes === originalScenes}
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>

          {saveFetcher.data?.success && (
            <div className="text-sm text-green-600 p-3 border border-green-200 rounded-lg bg-green-50 mb-4">
              Scenes saved successfully.
            </div>
          )}

          {saveFetcher.data?.error && (
            <div className="text-destructive text-sm p-3 border border-destructive/50 rounded-lg bg-destructive/10 mb-4">
              Error: {saveFetcher.data.error}
            </div>
          )}

          <div className="space-y-4">
            {scenes.map((scene, index) => (
              <div
                key={scene.scene_id}
                className="border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Scene {index + 1}
                  </span>
                  {index > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMergeWithPrevious(index)}
                    >
                      Merge with previous
                    </Button>
                  )}
                </div>
                <SceneContent
                  content={scene.scene_content}
                  onSplit={(pos) => handleSplit(index, pos)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
