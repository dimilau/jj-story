# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

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
