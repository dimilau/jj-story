import type { Route } from "./+types/admin.picture-books.$id.cover-image";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { generateFluxImage } from "../lib/flux.server";
import type { CoverImagePrompt } from "./admin.picture-books.$id.cover-image-prompt";

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

  const coverPromptObject = await env.BUCKET.get(
    `picture-books/${pictureBookId}/cover-image-prompt.json`
  );
  if (!coverPromptObject) {
    return Response.json(
      { error: "Cover image prompt not found. Generate the prompt first." },
      { status: 400 }
    );
  }
  const coverPrompt: CoverImagePrompt = JSON.parse(await coverPromptObject.text());

  const inputImages: Uint8Array[] = [];
  for (const id of coverPrompt.reference_images.slice(0, 4)) {
    const sheet = await env.BUCKET.get(
      `picture-books/${pictureBookId}/reference-sheets/${id}.png`
    );
    if (sheet) {
      inputImages.push(new Uint8Array(await sheet.arrayBuffer()));
    }
  }

  const extraPromptObject = await env.BUCKET.get(
    `picture-books/${pictureBookId}/extra-prompt.txt`
  );
  const extraPrompt = extraPromptObject
    ? (await extraPromptObject.text()).trim()
    : "";
  const finalPrompt = extraPrompt
    ? `${coverPrompt.prompt} ${extraPrompt}`
    : coverPrompt.prompt;

  let bytes: Uint8Array;
  try {
    bytes = await generateFluxImage({
      prompt: finalPrompt,
      width: 768,
      height: 1024,
      inputImages,
    });
  } catch (err) {
    return Response.json(
      { error: `Image generation failed: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  await env.BUCKET.put(
    `picture-books/${pictureBookId}/cover.png`,
    bytes,
    { httpMetadata: { contentType: "image/png" } }
  );

  return Response.json({ success: true });
}
