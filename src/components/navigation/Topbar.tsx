import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TopbarProps {
  currentPath?: string;
  userDisplayName?: string;
}

export function Topbar({ currentPath = "", userDisplayName = "Użytkownik" }: TopbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Wylogowano pomyślnie");
        // Redirect to login page after short delay
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 500);
      } else {
        toast.error("Nie udało się wylogować");
        setIsLoggingOut(false);
      }
    } catch {
      toast.error("Błąd połączenia");
      setIsLoggingOut(false);
    }
  };
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Helper function to check if path is active
  // const isActive = (path: string) => {
  //   if (path === "/") {
  //     return currentPath === "/" || currentPath === "";
  //   }
  //   return currentPath.startsWith(path);
  // };

  const navItems = [
    { href: "/", label: "Start", icon: "🏠", exact: true },
    { href: "/groups", label: "Grupy", icon: "👥", exact: false },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-shadow ${
        isScrolled ? "shadow-md" : ""
      }`}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-8">
        <div className="mr-4 flex">
          <a href="/" className="mr-6 flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.jpg" alt="LoreProgrammer" className="h-8" />
          </a>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const active = item.exact
                  ? currentPath === "/" || currentPath === ""
                  : currentPath.startsWith(item.href) && item.href !== "/";

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-9 px-4 py-2 ${
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-sm" asChild>
              <a href="/auth/profile">
                <span className="mr-2">👤</span>
                <span className="hidden sm:inline">{userDisplayName}</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm cursor-pointer"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-test-id="topbar-logout-button"
            >
              <span className="mr-2">🚪</span>
              <span className="hidden sm:inline">{isLoggingOut ? "Wylogowywanie..." : "Wyloguj"}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
