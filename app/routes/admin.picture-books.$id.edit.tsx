import { redirect, useFetcher } from "react-router";
import { useState, useEffect, useRef } from "react";
import type { Route } from "./+types/admin.picture-books.$id.edit";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { stories, pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import AdminLayout from "../components/admin-layout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ScissorsIcon, LockIcon, SparklesIcon, CheckIcon, CopyIcon, ImageIcon, ChevronDownIcon } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { env } from "cloudflare:workers";
import VisualInterviewChat from "../components/visual-interview-chat";
import VisualStyleSection from "../components/visual-style-section";
import type { VisualDetails, ScenePrompt } from "../lib/picture-book-prompts.server";

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

  const visualDetailsObject = await env.BUCKET.get(
    `picture-books/${pictureBookId}/visual-details.json`
  );
  const visualDetails: VisualDetails | null = visualDetailsObject
    ? JSON.parse(await visualDetailsObject.text())
    : null;

  const scenePromptsObject = await env.BUCKET.get(
    `picture-books/${pictureBookId}/scene-prompts.json`
  );
  const scenePrompts: ScenePrompt[] | null = scenePromptsObject
    ? JSON.parse(await scenePromptsObject.text())
    : null;

  // IDs of reference sheets that have actually been generated, so the UI only
  // links to images that exist (otherwise show a placeholder).
  const refSheetList = await env.BUCKET.list({
    prefix: `picture-books/${pictureBookId}/reference-sheets/`,
  });
  const referenceSheetIds = refSheetList.objects.map((o) =>
    o.key.split("/").pop()!.replace(/\.png$/, "")
  );

  // Scene numbers that already have a generated image.
  const sceneImageList = await env.BUCKET.list({
    prefix: `picture-books/${pictureBookId}/scenes/`,
  });
  const sceneImageNumbers = sceneImageList.objects.map((o) =>
    Number(o.key.split("/").pop()!.replace(/\.png$/, ""))
  );

  return {
    user,
    story,
    pictureBook,
    scenes,
    locked: pictureBook.locked,
    visualDetails,
    scenePrompts,
    referenceSheetIds,
    sceneImageNumbers,
    r2PublicUrl: env.R2_PUBLIC_URL,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") throw redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save" || intent === "save-lock") {
    const scenesJson = formData.get("scenes") as string;
    const db = getDb();
    const [pictureBook] = await db.select().from(pictureBooks).where(eq(pictureBooks.id, params.id!));
    if (!pictureBook) return { error: "Picture book not found" };

    await env.BUCKET.put(pictureBook.r2Key, scenesJson);

    if (intent === "save-lock") {
      await db
        .update(pictureBooks)
        .set({ locked: true })
        .where(eq(pictureBooks.id, params.id!));
    }

    return { success: true };
  }

  return { error: "Unknown action" };
}

function SceneContent({
  content,
  onSplit,
  disabled = false,
}: {
  content: string;
  onSplit: (splitPos: number) => void;
  disabled?: boolean;
}) {
  const periodPositions: number[] = [];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === ".") periodPositions.push(i);
  }

  if (disabled || periodPositions.length <= 1) {
    return <p className="text-sm leading-relaxed">{content}</p>;
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="absolute top-1.5 right-1.5"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Copy prompt"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </Button>
  );
}

// Extracts the trailing scene number from a label like "Scene 3".
function sceneNumber(label: string): number | null {
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function SceneImage({
  pictureBookId,
  sceneNum,
  hasImage,
  r2PublicUrl,
}: {
  pictureBookId: string;
  sceneNum: number;
  hasImage: boolean;
  r2PublicUrl: string;
}) {
  const fetcher = useFetcher<{ scene?: number; error?: string }>();
  const isGenerating = fetcher.state !== "idle";
  const [bust, setBust] = useState<number | null>(null);
  const lastDataRef = useRef<unknown>(null);

  // Cache-bust the image URL once a (re)generation completes.
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (lastDataRef.current === fetcher.data) return;
    lastDataRef.current = fetcher.data;
    if (fetcher.data.scene) setBust(Date.now());
  }, [fetcher.state, fetcher.data]);

  const showImage = hasImage || bust !== null;
  const url = `${r2PublicUrl}/picture-books/${pictureBookId}/scenes/${sceneNum}.png${
    bust ? `?t=${bust}` : ""
  }`;

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isGenerating}
        onClick={() =>
          fetcher.submit(
            { scene: String(sceneNum) },
            {
              method: "POST",
              action: `/admin/picture-books/${pictureBookId}/scene-image`,
            }
          )
        }
      >
        {isGenerating ? (
          <>
            <Spinner data-icon="inline-start" />
            Generating...
          </>
        ) : (
          <>
            <ImageIcon className="h-4 w-4 mr-1" />
            {showImage ? "Regenerate Image" : "Generate Image"}
          </>
        )}
      </Button>
      {fetcher.data?.error && (
        <p className="text-destructive text-sm">{fetcher.data.error}</p>
      )}
      {showImage && (
        <img
          src={url}
          alt={`Scene ${sceneNum}`}
          className="rounded-lg border border-border max-w-md w-full"
        />
      )}
    </div>
  );
}

export default function EditPictureBook({ loaderData }: Route.ComponentProps) {
  const {
    user,
    story,
    scenes: initialScenes,
    locked,
    visualDetails,
    scenePrompts,
    referenceSheetIds,
    sceneImageNumbers,
    r2PublicUrl,
  } = loaderData;
  const sceneImageSet = new Set(sceneImageNumbers);
  const saveFetcher = useFetcher<{ success?: boolean; error?: string }>();
  const promptsFetcher = useFetcher<{ scenePrompts?: ScenePrompt[]; error?: string }>();

  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [originalScenes] = useState<Scene[]>(initialScenes);
  const [history, setHistory] = useState<Scene[][]>([]);

  // Lookups for displaying generated prompts on each scene card.
  const promptByScene = new Map<number, ScenePrompt>();
  for (const p of scenePrompts ?? []) {
    const n = sceneNumber(p.scene);
    if (n != null) promptByScene.set(n, p);
  }
  const nounById = new Map<string, string>();
  for (const v of visualDetails?.visual_bible ?? []) {
    nounById.set(v.id, v.noun);
  }

  const hasPrompts = (scenePrompts?.length ?? 0) > 0;
  const isGeneratingPrompts = promptsFetcher.state !== "idle";

  const handleGeneratePrompts = () => {
    promptsFetcher.submit(
      {},
      { method: "POST", action: `/admin/picture-books/${loaderData.pictureBook.id}/prompts` }
    );
  };

  const saveHistory = (current: Scene[]) => {
    setHistory((prev) => [...prev, current]);
  };

  const renumber = (arr: Scene[]): Scene[] =>
    arr.map((s, i) => ({ ...s, scene_id: String(i + 1) }));

  const handleSplit = (sceneIndex: number, splitPos: number) => {
    if (locked) return;
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
    if (locked || index < 1) return;
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

  const handleSaveLock = () => {
    saveFetcher.submit(
      { intent: "save-lock", scenes: JSON.stringify(scenes) },
      { method: "POST" }
    );
  };

  const isSaving = saveFetcher.state !== "idle";
  const lockIntent = saveFetcher.formData?.get("intent") === "save-lock";
  const isLocking = isSaving && lockIntent;

  const scenesSection = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Scenes</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={locked || history.length === 0}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={locked || scenes === originalScenes}
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={locked || isSaving}
          >
            {isSaving && !lockIntent ? (
              <>
                <Spinner data-icon="inline-start" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
          <Button
            size="sm"
            variant={locked ? "secondary" : "default"}
            onClick={handleSaveLock}
            disabled={locked || isSaving}
          >
            {locked ? (
              <>
                <LockIcon className="h-4 w-4 mr-1" />
                Locked
              </>
            ) : isLocking ? (
              <>
                <Spinner data-icon="inline-start" />
                Locking...
              </>
            ) : (
              "Save & Lock"
            )}
          </Button>
          {locked && (
            <Button
              size="sm"
              onClick={handleGeneratePrompts}
              disabled={!visualDetails || isGeneratingPrompts}
              title={
                !visualDetails
                  ? "Complete the visual interview first"
                  : undefined
              }
            >
              {isGeneratingPrompts ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Generating...
                </>
              ) : hasPrompts ? (
                <>
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Regenerate Prompts
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Generate Prompts
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {promptsFetcher.data?.error && (
        <div className="text-destructive text-sm p-3 border border-destructive/50 rounded-lg bg-destructive/10 mb-4">
          Error: {promptsFetcher.data.error}
        </div>
      )}

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
              {!locked && index > 0 && (
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
              disabled={locked}
            />

            {(() => {
              const prompt = promptByScene.get(index + 1);
              if (!prompt) return null;
              return (
                <Collapsible className="mt-4 border-t border-border pt-3">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                    <span>Scene Prompt &amp; Images</span>
                    <ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-data-[panel-open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    <div className="relative">
                      <pre className="rounded-lg border border-border bg-muted/50 p-3 pr-10 text-xs whitespace-pre-wrap break-words font-mono">
                        {prompt.image_prompt}
                      </pre>
                      <CopyButton text={prompt.image_prompt} />
                    </div>

                    {prompt.reference_images.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {prompt.reference_images.map((id, i) => (
                          <Badge key={id} variant="secondary">
                            Image {i}: {id} ({nounById.get(id) ?? "?"})
                          </Badge>
                        ))}
                      </div>
                    )}

                    <SceneImage
                      pictureBookId={loaderData.pictureBook.id}
                      sceneNum={index + 1}
                      hasImage={sceneImageSet.has(index + 1)}
                      r2PublicUrl={r2PublicUrl}
                    />
                  </CollapsibleContent>
                </Collapsible>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AdminLayout userEmail={user.email}>
      <div className={locked ? "max-w-6xl" : "max-w-3xl"}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{story.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">Picture Book Editor</p>
        </div>

        {locked ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
            <div>
              {visualDetails && (
                <VisualStyleSection
                  visualDetails={visualDetails}
                  pictureBookId={loaderData.pictureBook.id}
                  r2PublicUrl={r2PublicUrl}
                  referenceSheetIds={referenceSheetIds}
                />
              )}
              {scenesSection}
            </div>
            <div className="lg:sticky lg:top-6 h-[calc(100vh-8rem)] border border-border rounded-lg overflow-hidden bg-card">
              <VisualInterviewChat pictureBookId={loaderData.pictureBook.id} />
            </div>
          </div>
        ) : (
          scenesSection
        )}
      </div>
    </AdminLayout>
  );
}
