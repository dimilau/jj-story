import type { Route } from "./+types/admin.picture-books.$id.cover-image-prompt";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import OpenAI from "openai";
import type { Scene, VisualDetails } from "../lib/picture-book-prompts.server";
import { formatVisualBible } from "../lib/picture-book-prompts.server";

export type CoverImagePrompt = {
  prompt: string;
  reference_images: string[];
};

const COVER_IMAGE_PROMPT_SYSTEM_PROMPT = `You are an expert book cover art director specializing in generating compelling cover image prompts for children's picture books.`;

function buildCoverImageUserMessage(
  scenes: Scene[],
  title: string,
  visualDetails: VisualDetails
): string {
  const storyText = scenes.map((s) => s.scene_content).join("\n\n");
  const visualBible = formatVisualBible(visualDetails.visual_bible);
  const artStyle = visualDetails.art_style;

  return `Given the story text for the book:
${storyText}

Given the title of the book is: "${title}"

Given the visual bible for the story:
${visualBible}

## Art style
Given the art style for the story: "${artStyle}"

Before writing the prompt, fill the "reference_images" array with visual bible element IDs that
    1. Initials of "C" or "P"
    2. appear in the cover image visually
    3. sorted by importance to the cover image
    4. limited to 4 elements.

Write an image prompt for the cover image of the book in "prompt". The cover image should not include text. When describing elements (Characters, Props, Locations), follow this prioritization and referencing scheme:
  * 1. Element is in the \`reference_images\` array: refer to it as \`{noun} (image N)\`(N is the 0-based index in the array). Do NOT describe its appearance; the reference image will be used for that.
  * 2. Element is not in \`reference_images\` but is in the Visual Bible: refer to it using its \`noun\`. Please describe its appearance/setting using its \`appearance_description\`.
  * 3. If the element is not in either, describe its role in the scene and its appearance in explicit.

## Output
JSON object with two keys:
- "prompt"
- "reference_images"`;
}

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

  const scenesObject = await env.BUCKET.get(pictureBook.r2Key);
  const scenes: Scene[] = scenesObject
    ? JSON.parse(await scenesObject.text())
    : [];

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

  const userMessage = buildCoverImageUserMessage(scenes, pictureBook.title, visualDetails);

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: env.DEEPSEEK_API_KEY,
  });

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: COVER_IMAGE_PROMPT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      stream: false,
    });
  } catch (err) {
    return Response.json(
      { error: `LLM request failed: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  const responseText = completion.choices[0]?.message?.content ?? "{}";
  const cleanJson = responseText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let coverPrompt: CoverImagePrompt;
  try {
    coverPrompt = JSON.parse(cleanJson);
  } catch {
    return Response.json(
      { error: "Failed to parse cover image prompt from AI response" },
      { status: 502 }
    );
  }

  await env.BUCKET.put(
    `picture-books/${pictureBookId}/cover-image-prompt.json`,
    JSON.stringify(coverPrompt)
  );

  return Response.json({ coverImagePrompt: coverPrompt });
}
