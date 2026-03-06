import { useEffect, useState, useRef } from "react";

export function useIntersectionObserver(options: IntersectionObserverInit = { threshold: 0.1 }) {
  const [elements, setElements] = useState<HTMLElement[]>([]);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible-animated"); // We'll handle the specific class in the component
          observer.current?.unobserve(entry.target);
        }
      });
    }, options);

    elements.forEach((el) => observer.current?.observe(el));

    return () => observer.current?.disconnect();
  }, [elements, options]);

  return setElements;
}

export function useCountUp(target: number, duration: number = 1800, suffix: string = "") {
  const [count, setCount] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setShouldAnimate(true);
        observer.disconnect();
      }
    }, { threshold: 0.3 });

    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldAnimate) return;

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [shouldAnimate, target, duration]);

  return { count: count.toLocaleString() + suffix, elementRef };
}
