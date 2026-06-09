import { redirect } from "react-router";
import { env } from "cloudflare:workers";

export async function loader() {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
