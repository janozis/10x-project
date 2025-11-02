import { Toaster as SonnerToaster, type ExternalToast } from "sonner";

export type { ExternalToast };

export function Toaster(): JSX.Element {
  return <SonnerToaster richColors position="top-right" />;
}


