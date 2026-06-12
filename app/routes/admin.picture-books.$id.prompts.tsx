import type { Route } from "./+types/admin.picture-books.$id.prompts";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import OpenAI from "openai";
import {
  buildScenePromptsUserMessage,
  SCENE_PROMPT_GENERATOR_SYSTEM_PROMPT,
  type Scene,
  type VisualDetails,
  type ScenePrompt,
} from "../lib/picture-book-prompts.server";

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

  const userMessage = buildScenePromptsUserMessage(scenes, visualDetails);

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: env.DEEPSEEK_API_KEY,
  });

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: SCENE_PROMPT_GENERATOR_SYSTEM_PROMPT },
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

  const responseText = completion.choices[0]?.message?.content ?? "[]";
  const cleanJson = responseText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let scenePrompts: ScenePrompt[];
  try {
    scenePrompts = JSON.parse(cleanJson);
  } catch {
    return Response.json(
      { error: "Failed to parse scene prompts from AI response" },
      { status: 502 }
    );
  }

  await env.BUCKET.put(
    `picture-books/${pictureBookId}/scene-prompts.json`,
    JSON.stringify(scenePrompts)
  );

  return Response.json({ scenePrompts });
}
