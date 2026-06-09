import { redirect } from "react-router";
import type { Route } from "./+types/admin.users";
import { getSessionUser } from "../lib/auth.server";
import { getDb } from "../db/index.server";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import AdminLayout from "../components/admin-layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Manage Users" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/dashboard");

  const db = getDb();
  const allUsers = await db.select().from(users);

  return { user, allUsers };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") throw redirect("/login");

  if (request.method === "POST") {
    const formData = await request.formData();
    const userId = parseInt(formData.get("userId") as string);
    const role = formData.get("role") as "user" | "admin";

    if (!userId || !role) {
      return { error: "Missing required fields" };
    }

    const db = getDb();
    await db.update(users).set({ role }).where(eq(users.id, userId));

    return { success: true };
  }

  return { error: "Invalid request" };
}

function UserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: (typeof users.$inferSelect) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [role, setRole] = useState<string>(user?.role || "user");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("userId", user!.id.toString());
    formData.append("role", role);

    const response = await fetch("", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      setIsSaving(false);
      onOpenChange(false);
      window.location.reload();
    }
    setIsSaving(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenChange={onOpenChange}>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user role and permissions</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm text-muted-foreground px-2 py-1">{user.email}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Role</Label>
            <Select
              items={[
                { label: "User", value: "user" },
                { label: "Admin", value: "admin" },
              ]}
              value={role}
              onValueChange={(value) => {
                if (value) setRole(value as "user" | "admin");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { label: "User", value: "user" },
                  { label: "Admin", value: "admin" },
                ].map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers({ loaderData, actionData }: Route.ComponentProps) {
  const { user, allUsers } = loaderData;
  const [selectedUser, setSelectedUser] = useState<(typeof users.$inferSelect) | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUserClick = (clickedUser: typeof users.$inferSelect) => {
    setSelectedUser(clickedUser);
    setDialogOpen(true);
  };

  return (
    <AdminLayout userEmail={user.email}>
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold mb-6">Users</h2>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers.map((u) => (
                <TableRow
                  key={u.id}
                  onClick={() => handleUserClick(u)}
                  className="cursor-pointer"
                >
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(u);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <UserDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </AdminLayout>
  );
}
