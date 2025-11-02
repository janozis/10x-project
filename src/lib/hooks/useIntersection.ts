import * as React from "react";

export function useIntersection(
  ref: React.RefObject<Element | null>,
  options?: IntersectionObserverInit
): boolean {
  const [intersecting, setIntersecting] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setIntersecting(entry.isIntersecting);
    }, options ?? { root: null, rootMargin: "0px", threshold: 0 });
    obs.observe(el);
    return () => {
      obs.disconnect();
    };
  }, [ref, options?.root, options?.rootMargin, options?.threshold]);

  return intersecting;
}


