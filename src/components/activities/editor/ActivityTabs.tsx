import * as React from "react";

type TabKey = "form" | "editors" | "ai" | "tasks";

interface ActivityTabsProps {
  defaultTab?: TabKey;
  form: React.ReactNode;
  editors: React.ReactNode;
  ai: React.ReactNode;
  tasks: React.ReactNode;
}

export function ActivityTabs({ defaultTab = "form", form, editors, ai, tasks }: ActivityTabsProps): JSX.Element {
  const [tab, setTab] = React.useState<TabKey>(defaultTab);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border overflow-hidden" role="tablist" aria-label="Sekcje edytora">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "form"}
          className={`px-3 py-1.5 text-sm ${tab === "form" ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted"}`}
          onClick={() => setTab("form")}
        >
          Formularz
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "editors"}
          className={`px-3 py-1.5 text-sm border-l ${tab === "editors" ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted"}`}
          onClick={() => setTab("editors")}
        >
          Edytorzy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ai"}
          className={`px-3 py-1.5 text-sm border-l ${tab === "ai" ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted"}`}
          onClick={() => setTab("ai")}
        >
          Oceny AI
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "tasks"}
          className={`px-3 py-1.5 text-sm border-l ${tab === "tasks" ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted"}`}
          onClick={() => setTab("tasks")}
        >
          Zadania
        </button>
      </div>

      <div role="tabpanel" hidden={tab !== "form"}>
        {tab === "form" ? form : null}
      </div>
      <div role="tabpanel" hidden={tab !== "editors"}>
        {tab === "editors" ? editors : null}
      </div>
      <div role="tabpanel" hidden={tab !== "ai"}>
        {tab === "ai" ? ai : null}
      </div>
      <div role="tabpanel" hidden={tab !== "tasks"}>
        {tab === "tasks" ? tasks : null}
      </div>
    </div>
  );
}


