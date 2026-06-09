import { redirect } from "react-router";
import type { Route } from "./+types/admin.dashboard";
import { getSessionUser } from "../lib/auth.server";
import AdminLayout from "../components/admin-layout";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin Dashboard" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");
  if (user.role !== "admin") throw redirect("/dashboard");
  return { user };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <AdminLayout userEmail={user.email}>
      <div className="max-w-4xl">
        <h2 className="text-3xl font-bold mb-4">Welcome to the admin dashboard!</h2>
        <p className="text-muted-foreground">
          Use the navigation menu to manage users and system settings.
        </p>
      </div>
    </AdminLayout>
  );
}
