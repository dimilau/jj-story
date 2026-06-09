import { redirect } from "react-router";
import { env } from "cloudflare:workers";
import {
  findOrCreateGoogleUser,
  createSession,
  buildSessionCookie,
} from "../lib/auth.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return redirect("/login?error=google_auth_failed");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return redirect("/login?error=token_exchange_failed");
  }

  const tokens = (await tokenRes.json()) as { access_token: string };

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return redirect("/login?error=userinfo_failed");
  }

  const userInfo = (await userInfoRes.json()) as { sub: string; email: string };

  const result = await findOrCreateGoogleUser(userInfo.sub, userInfo.email);
  if (!result.success) {
    return redirect("/login?error=user_creation_failed");
  }

  const token = await createSession(result.userId);
  const isSecure = url.protocol === "https:";

  return redirect("/dashboard", {
    headers: { "Set-Cookie": buildSessionCookie(token, isSecure) },
  });
}

export default function GoogleCallback() {
  return null;
}
