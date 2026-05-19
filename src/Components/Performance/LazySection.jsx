import { Suspense, useEffect, useRef, useState } from "react";

export default function LazySection({ children, minHeight = "420px", rootMargin = "500px" }) {
  const ref = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldRender) return undefined;

    const node = ref.current;
    if (!node) return undefined;

    if (!("IntersectionObserver" in window)) {
      const timeout = window.setTimeout(() => setShouldRender(true), 0);
      return () => window.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return undefined;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [shouldRender]);

  return (
    <div
      ref={ref}
      style={{ minHeight: shouldRender ? undefined : minHeight }}
      className={`transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform] ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {shouldRender ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}
