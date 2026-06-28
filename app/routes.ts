import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("logout", "routes/logout.tsx"),
  route("auth/google", "routes/auth.google.tsx"),
  route("auth/google/callback", "routes/auth.google.callback.tsx"),
  route("admin/dashboard", "routes/admin.dashboard.tsx"),
  route("admin/users", "routes/admin.users.tsx"),
  route("admin/stories", "routes/admin.stories.tsx"),
  route("admin/stories/new", "routes/admin.stories.new.tsx"),
  route("admin/stories/:id/edit", "routes/admin.stories.$id.edit.tsx"),
  route("admin/picture-books", "routes/admin.picture-books.tsx"),
  route("admin/picture-books/:id/edit", "routes/admin.picture-books.$id.edit.tsx"),
  route("admin/picture-books/:id/interview", "routes/admin.picture-books.$id.interview.tsx"),
  route("admin/picture-books/:id/prompts", "routes/admin.picture-books.$id.prompts.tsx"),
  route("admin/picture-books/:id/visuals", "routes/admin.picture-books.$id.visuals.tsx"),
  route("admin/picture-books/:id/scene-image", "routes/admin.picture-books.$id.scene-image.tsx"),
  route("admin/picture-books/:id/cover-image-prompt", "routes/admin.picture-books.$id.cover-image-prompt.tsx"),
  route("admin/picture-books/:id/cover-image", "routes/admin.picture-books.$id.cover-image.tsx"),
] satisfies RouteConfig;
