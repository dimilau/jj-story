## Getting Started

### ☁️ Setup Remote Services
Setup required remote services before running the application.

#### 🔸 Google Cloud Project
1. Google Cloud Console > Select a Project > New project
2. APIs & Services > OAuth consent screen
3. Clients > Create Client > Web application

#### 🔸 DeepSeek API Key
1. Sign up for a DeepSeek account at "https://platform.deepseek.com"

#### 🔸 Cloudflare
* Workers & Pages > Create application > "Start with Hello World!"
* D1 Sqlite Database > Create database > "[jumping-joy-story]"
* R2 Object Storage > Create bucket > "[jumping-joy-story]"
    * Enable "Public Development URL": 
        ```
        Cloudflare Dashboard > R2 Object Storage > [jumping-joy-story] > General > Public Development URL > Enable
        ```

### 🖥 Local Installation

1. Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

1. Install the dependencies and set up the D1 database and R2 bucket:

    ```bash
    pnpm install
    pnpm build
    ```

2. Set up local environment variables by renaming `.dev.vars.example` to `.dev.vars` and filling in the required values.

3. Local database migration:
    ```bash
    pnpm wrangler d1 migrations apply DB --local
    # OR
    pnpm db:migrate:local
    ```

4. Assign admin role to a user by running the following command and replacing `<user@example.com>` with the user's email:
    ```bash
    wrangler d1 execute <database-name> --local --command "UPDATE users SET role = 'admin' WHERE email = 'user@example.com';"
    ```

Note: Worker doesn't need to exist for local development, but it is required for deployment.

### ⛅️ Deploying to Cloudflare

1. Workers & Pages > Create application > "Start with Hello World!" > Deploy

2. Workers & Pages > [jumping-joy-story] > Settings:
    * Variables and secrets: Copy the value from `.dev.vars`, in "Variables and secrets" section, click "Add", select a field, and paste the value.
    * Build > Git repository > Connect to a repostory. Set up "Build command" to `pnpm build` and "Deploy command" to `pnpm wrangler d1 migrations apply DB --remote && pnpm wrangler deploy`.



Set worker secrets, edit, upload to remote:
```
cp secrets.json.example secrets.json
vim secrets.json
pnpm wrangler secret bulk < secrets.json
```


------------

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

## Admin Panel

### Creating the First Admin User

To create an admin user, use the Wrangler D1 CLI to execute a SQL update statement on your database.

First, find the ID of the user you want to promote to admin. Then run:

```bash
wrangler d1 execute <database-name> --remote --file -
```

And paste the following SQL statement:

```sql
UPDATE users SET role = 'admin' WHERE id = <user-id>;
```

Replace `<user-id>` with the actual user ID (e.g., `UPDATE users SET role = 'admin' WHERE id = 1;`).

Alternatively, to promote a user by email:

```bash
wrangler d1 execute <database-name> --remote --file -
```

```sql
UPDATE users SET role = 'admin' WHERE email = 'user@gmail.com';
```

```bash
wrangler d1 execute <database-name> --local --command "UPDATE users SET role = 'admin' WHERE email = 'user@gmail.com';"

After promoting a user to admin, they will have access to:
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - User management interface where admins can view and edit user roles

---

Built with ❤️ using React Router.

