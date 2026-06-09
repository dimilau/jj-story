import { useState, useRef, useEffect } from "react";
import { Form, Link } from "react-router";
import { MountainSnow, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

export default function AdminLayout({ children, userEmail }: AdminLayoutProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <MountainSnow className="h-6 w-6" />
          <h1 className="text-xl font-bold">Jumping Joy Story</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <Link
            to="/admin/dashboard"
            className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/admin/users"
            className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Users
          </Link>
        </nav>

        <div className="relative" ref={dropdownRef}>
          <Button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            variant="ghost"
            className="w-full justify-start gap-2"
            title={userEmail}
          >
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs flex-shrink-0">
              {userEmail[0].toUpperCase()}
            </div>
            <span className="truncate text-sm">{userEmail}</span>
          </Button>

          {dropdownOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-48 rounded-md border border-border bg-card shadow-md z-50">
              <Form method="post" action="/logout" className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent rounded-md text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </Form>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
