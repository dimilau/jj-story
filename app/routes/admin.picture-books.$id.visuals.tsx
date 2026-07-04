import type { Route } from "./+types/admin.picture-books.$id.visuals";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { generateFluxImage } from "../lib/flux.server";
import type { VisualDetails } from "../lib/picture-book-prompts.server";

// Reference sheets are generated at 512x512 so they can be fed back directly as
// input_image_N when generating scene images (FLUX.2 caps inputs at 512x512).
const REF_SHEET_SIZE = 512;

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pictureBookId = params.id;
  if (!pictureBookId) {
    return Response.json({ error: "Missing picture book ID" }, { status: 400 });
  }

  const db = getDb();
  const [pictureBook] = await db
    .select()
    .from(pictureBooks)
    .where(eq(pictureBooks.id, pictureBookId));
  if (!pictureBook) {
    return Response.json({ error: "Picture book not found" }, { status: 404 });
  }

  const visualDetailsObject = await env.BUCKET.get(
    `picture-books/${pictureBookId}/visual-details.json`
  );
  if (!visualDetailsObject) {
    return Response.json(
      { error: "Visual details not found. Complete the interview first." },
      { status: 400 }
    );
  }
  const visualDetails: VisualDetails = JSON.parse(
    await visualDetailsObject.text()
  );

  // Only characters/props (with a reference_sheet_prompt) get reference sheets.
  const entries = visualDetails.visual_bible.filter(
    (e) => e.reference_sheet_prompt != null && e.reference_sheet_prompt !== ""
  );

  const generated: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const entry of entries) {
    try {
      const bytes = await generateFluxImage({
        prompt: entry.reference_sheet_prompt!,
        width: REF_SHEET_SIZE,
        height: REF_SHEET_SIZE,
      });
      await env.BUCKET.put(
        `picture-books/${pictureBookId}/reference-sheets/${entry.id}.webp`,
        bytes,
        { httpMetadata: { contentType: "image/webp" } }
      );
      generated.push(entry.id);
    } catch (err) {
      failed.push({ id: entry.id, error: (err as Error).message });
    }
  }

  return Response.json({ generated, failed });
}
