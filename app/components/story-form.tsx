"use client";

import { useState, useEffect } from "react";
import { Form, Link } from "react-router";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StoryFormProps {
  defaultTitle?: string;
  defaultContent?: string;
  error?: string;
}

export function StoryForm({ defaultTitle = "", defaultContent = "", error }: StoryFormProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [content, setContent] = useState(defaultContent);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (tab === "preview") {
      const html = marked.parse(content) as string;
      setPreview(html);
    }
  }, [tab, content]);

  return (
    <Form method="post" className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaultTitle}
          placeholder="Story title"
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex border-b border-border bg-muted/40">
            <button
              type="button"
              onClick={() => setTab("write")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "write"
                  ? "bg-background border-b-2 border-primary text-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "preview"
                  ? "bg-background border-b-2 border-primary text-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Preview
            </button>
          </div>

          {tab === "write" ? (
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your story in markdown..."
              rows={16}
              className="w-full px-4 py-3 text-sm font-mono bg-background resize-none focus:outline-none"
            />
          ) : (
            <>
              <input type="hidden" name="content" value={content} />
              <div
                className="min-h-[352px] px-4 py-3 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: preview || "<p class='text-muted-foreground'>Nothing to preview.</p>" }}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link to="/admin/stories">
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
        <Button type="submit">Save Story</Button>
      </div>
    </Form>
  );
}
