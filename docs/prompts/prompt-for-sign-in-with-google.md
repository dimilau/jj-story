- In the "/login" page, user should be able to sign in with Google. Remember to add a "G" Google icon on the left of the "Sign in with Google" button.
- add a `.dev.vars `file in the root of the project with the following content:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_REDIRECT_URI=your_google_redirect_uri
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

- Add the environment variable `GOOGLE_CLIENT_ID` & `GOOGLE_REDIRECT_URI` to `wrangler.jsonc`
- create a file called `secrets.json.example` in the root of the project with the following content:

```json
{
    "GOOGLE_CLIENT_SECRET": "your_google_client_secret"
}
```