import type { Route } from "./+types/admin.picture-books.$id.scene-image";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { generateFluxImage } from "../lib/flux.server";
import type { ScenePrompt } from "../lib/picture-book-prompts.server";

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pictureBookId = params.id;
  if (!pictureBookId) {
    return Response.json({ error: "Missing picture book ID" }, { status: 400 });
  }

  const formData = await request.formData();
  const sceneNum = Number(formData.get("scene"));
  if (!sceneNum || Number.isNaN(sceneNum)) {
    return Response.json({ error: "Invalid scene" }, { status: 400 });
  }

  const db = getDb();
  const [pictureBook] = await db
    .select()
    .from(pictureBooks)
    .where(eq(pictureBooks.id, pictureBookId));
  if (!pictureBook) {
    return Response.json({ error: "Picture book not found" }, { status: 404 });
  }

  const scenePromptsObject = await env.BUCKET.get(
    `picture-books/${pictureBookId}/scene-prompts.json`
  );
  if (!scenePromptsObject) {
    return Response.json(
      { error: "Scene prompts not found. Generate prompts first." },
      { status: 400 }
    );
  }
  const scenePrompts: ScenePrompt[] = JSON.parse(
    await scenePromptsObject.text()
  );

  const prompt = scenePrompts.find((p) => Number(p.scene_id) === sceneNum);
  if (!prompt) {
    return Response.json(
      { error: `No prompt found for scene ${sceneNum}` },
      { status: 400 }
    );
  }

  // Collect reference-sheet images (in reference_images order, max 4) so they
  // map to input_image_0..3 exactly as the (image N) tags in the prompt expect.
  const inputImages: Uint8Array[] = [];
  for (const id of prompt.reference_images.slice(0, 4)) {
    const sheet = await env.BUCKET.get(
      `picture-books/${pictureBookId}/reference-sheets/${id}.png`
    );
    if (sheet) {
      inputImages.push(new Uint8Array(await sheet.arrayBuffer()));
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await generateFluxImage({
      prompt: prompt.image_prompt,
      width: 1024,
      height: 768,
      inputImages,
    });
  } catch (err) {
    return Response.json(
      { error: `Image generation failed: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  await env.BUCKET.put(
    `picture-books/${pictureBookId}/scenes/${sceneNum}.png`,
    bytes,
    { httpMetadata: { contentType: "image/png" } }
  );

  return Response.json({ scene: sceneNum });
}
