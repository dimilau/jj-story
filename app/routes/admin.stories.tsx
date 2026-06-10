import { redirect, Link, Form } from "react-router";
import type { Route } from "./+types/admin.stories";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { stories, users } from "../db/schema";
import { eq } from "drizzle-orm";
import AdminLayout from "../components/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Manage Stories" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/dashboard");

  const db = getDb();
  const allStories = await db
    .select({
      id: stories.id,
      title: stories.title,
      createdAt: stories.createdAt,
      authorEmail: users.email,
    })
    .from(stories)
    .leftJoin(users, eq(stories.authorId, users.id))
    .orderBy(stories.createdAt);

  return { user, allStories };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") throw redirect("/login");

  if (request.method === "POST") {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    if (intent === "delete") {
      const storyId = parseInt(formData.get("storyId") as string);
      if (!storyId) return { error: "Missing story ID" };
      const db = getDb();
      await db.delete(stories).where(eq(stories.id, storyId));
      return { success: true };
    }
  }

  return { error: "Invalid request" };
}

export default function AdminStories({ loaderData }: Route.ComponentProps) {
  const { user, allStories } = loaderData;

  return (
    <AdminLayout userEmail={user.email}>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Stories</h2>
          <Link to="/admin/stories/new">
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              New Story
            </Button>
          </Link>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allStories.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground py-8">
                    No stories yet. Create your first one!
                  </TableCell>
                </TableRow>
              ) : (
                allStories.map((story) => (
                  <TableRow key={story.id}>
                    <TableCell className="font-medium">{story.title}</TableCell>
                    <TableCell className="text-muted-foreground">{story.authorEmail}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {story.createdAt
                        ? new Date(story.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/stories/${story.id}/edit`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="storyId" value={story.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              if (!confirm(`Delete "${story.title}"?`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </Form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
