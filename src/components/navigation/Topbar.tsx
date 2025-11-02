import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  currentPath?: string;
}

export function Topbar({ currentPath = "" }: TopbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/" || currentPath === "";
    }
    return currentPath.startsWith(path);
  };

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
          <a href="/" className="mr-6 flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              10x Project
            </span>
          </a>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const active = item.exact 
                  ? (currentPath === "/" || currentPath === "")
                  : currentPath.startsWith(item.href) && item.href !== "/";
                
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-9 px-4 py-2 ${
                      active
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
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
            <Button
              variant="ghost"
              size="sm"
              className="text-sm"
              onClick={() => {
                // TODO: Implement user menu / logout
                console.log("User menu clicked");
              }}
            >
              <span className="mr-2">👤</span>
              <span className="hidden sm:inline">Profil</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

