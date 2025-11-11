import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

/**
 * Custom render function that wraps components with common providers
 * Extend this as needed when you add global providers (e.g., Theme, Router, etc.)
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => {
  // Add any global providers here if needed
  // const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  //   return <ThemeProvider>{children}</ThemeProvider>
  // }

  return render(ui, { ...options });
};

// Re-export everything from testing library
export * from "@testing-library/react";

// Override render method
export { customRender as render };
