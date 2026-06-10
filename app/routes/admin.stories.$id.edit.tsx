import { redirect } from "react-router";
import type { Route } from "./+types/admin.stories.$id.edit";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { stories } from "../db/schema";
import { eq } from "drizzle-orm";
import AdminLayout from "../components/admin-layout";
import { StoryForm } from "../components/story-form";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data ? `Edit: ${data.story.title}` : "Edit Story" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/dashboard");

  const storyId = params.id;
  if (!storyId) throw redirect("/admin/stories");

  const db = getDb();
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  if (!story) throw redirect("/admin/stories");

  return { user, story };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") throw redirect("/login");

  const storyId = params.id;
  if (!storyId) throw redirect("/admin/stories");

  const formData = await request.formData();
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string) ?? "";

  if (!title) {
    return { error: "Title is required" };
  }

  const db = getDb();
  await db
    .update(stories)
    .set({ title, content, updatedAt: new Date() })
    .where(eq(stories.id, storyId));

  throw redirect("/admin/stories");
}

export default function EditStory({ loaderData, actionData }: Route.ComponentProps) {
  const { user, story } = loaderData;

  return (
    <AdminLayout userEmail={user.email}>
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold mb-6">Edit Story</h2>
        <StoryForm defaultTitle={story.title} defaultContent={story.content} error={actionData?.error} />
      </div>
    </AdminLayout>
  );
}
