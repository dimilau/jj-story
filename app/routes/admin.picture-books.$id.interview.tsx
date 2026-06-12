import type { Route } from "./+types/admin.picture-books.$id.interview";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { pictureBooks } from "../db/schema";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import OpenAI from "openai";
import {
  buildInterviewSystemPrompt,
  SAVE_VISUAL_DETAILS_TOOL,
  type Scene,
} from "../lib/picture-book-prompts.server";

type ChatMessage = { role: "user" | "assistant"; content: string };

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

  const formData = await request.formData();
  let messages: ChatMessage[];
  try {
    messages = JSON.parse((formData.get("messages") as string) ?? "[]");
  } catch {
    return Response.json({ error: "Invalid messages" }, { status: 400 });
  }

  const scenesObject = await env.BUCKET.get(pictureBook.r2Key);
  const scenes: Scene[] = scenesObject
    ? JSON.parse(await scenesObject.text())
    : [];

  const systemPrompt = buildInterviewSystemPrompt(scenes);

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: env.DEEPSEEK_API_KEY,
  });

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: [SAVE_VISUAL_DETAILS_TOOL],
      stream: false,
    });
  } catch (err) {
    return Response.json(
      { error: `LLM request failed: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  const choice = completion.choices[0]?.message;

  const toolCall = choice?.tool_calls?.find(
    (tc) => tc.type === "function" && tc.function.name === "save_visual_details"
  );

  if (toolCall && toolCall.type === "function") {
    let visualDetails: unknown;
    try {
      visualDetails = JSON.parse(toolCall.function.arguments);
    } catch {
      return Response.json(
        { error: "Failed to parse visual details from AI response" },
        { status: 502 }
      );
    }

    const visualDetailsKey = `picture-books/${pictureBookId}/visual-details.json`;
    await env.BUCKET.put(visualDetailsKey, JSON.stringify(visualDetails));

    return Response.json({ done: true });
  }

  return Response.json({ message: choice?.content ?? "" });
}
