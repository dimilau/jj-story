import { redirect } from "react-router";
import type { Route } from "./+types/admin.stories.new";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { stories } from "../db/schema";
import AdminLayout from "../components/admin-layout";
import { StoryForm } from "../components/story-form";

export function meta({}: Route.MetaArgs) {
  return [{ title: "New Story" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/dashboard");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") throw redirect("/login");

  const formData = await request.formData();
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string) ?? "";

  if (!title) {
    return { error: "Title is required" };
  }

  const db = getDb();
  const storyId = crypto.randomUUID();
  await db.insert(stories).values({
    id: storyId,
    title,
    content,
    authorId: user.id,
  });

  throw redirect("/admin/stories");
}

export default function NewStory({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <AdminLayout userEmail={user.email}>
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold mb-6">New Story</h2>
        <StoryForm error={actionData?.error} />
      </div>
    </AdminLayout>
  );
}
