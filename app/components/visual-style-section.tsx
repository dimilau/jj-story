import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageIcon, SparklesIcon } from "lucide-react";
import type {
  VisualDetails,
  VisualBibleEntry,
} from "../lib/picture-book-prompts.server";

function referenceSheetUrl(
  r2PublicUrl: string,
  pictureBookId: string,
  vbId: string
) {
  return `${r2PublicUrl}/picture-books/${pictureBookId}/reference-sheets/${vbId}.webp`;
}

function Thumbnail({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={
          "flex items-center justify-center bg-muted text-muted-foreground " +
          (className ?? "")
        }
      >
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={"object-cover " + (className ?? "")}
    />
  );
}

export default function VisualStyleSection({
  visualDetails,
  pictureBookId,
  r2PublicUrl,
  referenceSheetIds,
}: {
  visualDetails: VisualDetails;
  pictureBookId: string;
  r2PublicUrl: string;
  referenceSheetIds: string[];
}) {
  const [selected, setSelected] = useState<VisualBibleEntry | null>(null);
  const visualsFetcher = useFetcher<{
    generated?: string[];
    failed?: { id: string; error: string }[];
    error?: string;
  }>();
  const isGenerating = visualsFetcher.state !== "idle";
  const generatedIds = new Set(referenceSheetIds);

  // Only link to an image once its reference sheet has actually been generated.
  const urlFor = (entry: VisualBibleEntry) =>
    generatedIds.has(entry.id)
      ? referenceSheetUrl(r2PublicUrl, pictureBookId, entry.id)
      : null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Visual &amp; Style</h3>
        <Button
          size="sm"
          variant="outline"
          disabled={isGenerating}
          onClick={() =>
            visualsFetcher.submit(
              {},
              {
                method: "POST",
                action: `/admin/picture-books/${pictureBookId}/visuals`,
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
              <SparklesIcon className="h-4 w-4 mr-1" />
              {referenceSheetIds.length > 0 ? "Regenerate Visuals" : "Generate Visuals"}
            </>
          )}
        </Button>
      </div>

      {visualsFetcher.data?.error && (
        <div className="text-destructive text-sm p-3 border border-destructive/50 rounded-lg bg-destructive/10 mb-4">
          Error: {visualsFetcher.data.error}
        </div>
      )}
      {visualsFetcher.data?.failed && visualsFetcher.data.failed.length > 0 && (
        <div className="text-amber-700 text-sm p-3 border border-amber-200 rounded-lg bg-amber-50 mb-4">
          Some visuals failed to generate:{" "}
          {visualsFetcher.data.failed.map((f) => f.id).join(", ")}
        </div>
      )}

      {/* Visual Bible */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Visual Bible
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visualDetails.visual_bible.map((entry) => {
            const url = urlFor(entry);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelected(entry)}
                className="flex items-center gap-3 rounded-lg border border-border p-2 text-left hover:bg-accent transition-colors"
              >
                <Thumbnail
                  src={url}
                  alt={entry.noun}
                  className="h-12 w-12 shrink-0 rounded-md"
                />
                <div className="min-w-0">
                  <p className="text-xs font-mono text-muted-foreground">
                    {entry.id}
                  </p>
                  <p className="text-sm font-medium truncate">{entry.noun}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Art Style */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Art Style
        </h4>
        <pre className="rounded-lg border border-border bg-muted/50 p-3 text-xs whitespace-pre-wrap break-words font-mono">
          {visualDetails.art_style}
        </pre>
      </div>

      {/* Detail dialog */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  <span className="font-mono text-muted-foreground mr-2">
                    {selected.id}
                  </span>
                  {selected.noun}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
                <Thumbnail
                  src={urlFor(selected)}
                  alt={selected.noun}
                  className="h-48 w-full rounded-lg border border-border"
                />
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Role
                    </p>
                    <p>{selected.role}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Appearance Description
                    </p>
                    <p>{selected.appearance_description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Reference Sheet Prompt
                    </p>
                    <p className="text-muted-foreground">
                      {selected.reference_sheet_prompt ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
