import { getSessionUser } from "../lib/auth.server";
import { env } from "cloudflare:workers";
import type { Route } from "./+types/images.$";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") {
    return new Response("Not found", { status: 404 });
  }

  const key = params["*"];
  if (!key || !key.startsWith("picture-books/")) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.BUCKET.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=300",
    },
  });
}
