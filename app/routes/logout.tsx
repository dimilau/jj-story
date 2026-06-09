import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { deleteSession, buildClearSessionCookie } from "../lib/auth.server";

export async function loader() {
  return redirect("/login");
}

export async function action({ request }: Route.ActionArgs) {
  await deleteSession(request);
  return redirect("/login", {
    headers: { "Set-Cookie": buildClearSessionCookie() },
  });
}
