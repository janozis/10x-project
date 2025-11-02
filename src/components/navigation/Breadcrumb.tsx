import { ChevronLeft } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <a
              href={item.href}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
            {index < items.length - 1 && (
              <span className="text-muted-foreground/50" aria-hidden="true">
                /
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

