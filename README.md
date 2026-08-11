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

1. Workers & Pages > Create application > Continue with Github > Select a repository
    * Set up "Build command" to `pnpm build`
    * Set up "Deploy command" to `pnpm wrangler d1 migrations apply DB --remote && pnpm wrangler deploy`
    * Deploy

2. Set worker secrets, edit, upload to remote:
    ```
    cp secrets.json.example secrets.json
    vim secrets.json
    pnpm wrangler secret bulk < secrets.json
    ```

3. Assign admin role to a user by running the following command and replacing `<user@example.com>` with the user's email:
    ```bash
    pnpm wrangler d1 execute <database-name> --remote --command "UPDATE users SET role = 'admin' WHERE email = '<user@example.com>';"
    ```

### ⚡️ Commands

* Start development server with HMR: `pnpm run dev`
* Preview the production build locally: `pnpm run preview`
* Build the production version: `pnpm run build`
* Build and deploy directly to production: `pnpm run deploy`
* Deploy a preview URL: `pnpm wrangler versions upload`
* Promote a version to production after verification or roll it out progressively: `pnpm wrangler versions deploy`

Test