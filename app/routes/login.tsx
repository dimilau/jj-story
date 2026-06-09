import { redirect, Form, Link, useActionData } from "react-router";
import type { Route } from "./+types/login";
import {
  getSessionUser,
  loginUser,
  createSession,
  buildSessionCookie,
} from "../lib/auth.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Sign In" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (user) throw redirect("/dashboard");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return { error: "All fields are required" };
  }

  const result = await loginUser(email, password);
  if (!result.success) {
    return { error: result.error };
  }

  const token = await createSession(result.userId);
  const isSecure = new URL(request.url).protocol === "https:";

  return redirect("/dashboard", {
    headers: { "Set-Cookie": buildSessionCookie(token, isSecure) },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent className="space-y-4">
            {actionData?.error && (
              <p className="text-sm text-destructive">{actionData.error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full">
              Sign In
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="underline underline-offset-4 hover:text-primary">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
