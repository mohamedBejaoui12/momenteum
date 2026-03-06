import { useRef, useEffect } from "react";
import styles from "./Landing.module.css";
import { useCountUp } from "./LandingHooks";

const FEATURES = [
  {
    id: "fc1",
    title: "Daily task tracking",
    desc: "Add tasks with zero friction. Mark them done, watch the progress bar fill up, and feel the satisfaction of a structured day.",
    icon: <path d="M2 4h12M2 8h8M2 12h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  },
  {
    id: "fc2",
    title: "Visual analytics",
    desc: "Charts, streaks, and weekly summaries make your progress undeniable. Every check-in adds to a story of growth.",
    icon: <path d="M3 12l2.5-5L8 9l2.5-4L14 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  },
  {
    id: "fc3",
    title: "Habit streaks",
    desc: "Build consistency with daily habit counters. Streaks keep you motivated even when the days get hard.",
    icon: <path d="M8 2v12M2 8l6 6 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  },
  {
    id: "fc4",
    title: "Smart reminders",
    desc: "Set reminders for anything that matters. Timely nudges keep your priorities front and center throughout the day.",
    icon: <><circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5"/><path d="M8 5v3l2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></>
  },
  {
    id: "fc5",
    title: "Calendar view",
    desc: "Browse past days, review what you completed, and plan ahead. A full calendar overview keeps you in control.",
    icon: <><rect x="2" y="2" width="5" height="5" rx="1" stroke="white" strokeWidth="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="white" strokeWidth="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="white" strokeWidth="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="white" strokeWidth="1.5"/></>
  },
  {
    id: "fc6",
    title: "Free to start",
    desc: "A generous free tier, no credit card required. Start tracking today and upgrade only when you need more.",
    icon: <path d="M13 3l-7 7-3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  }
];

export function FeaturesSection() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = cardsRef.current.indexOf(entry.target as HTMLDivElement);
          setTimeout(() => {
            entry.target.classList.add(styles.featureCardVisible);
          }, index * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    cardsRef.current.forEach(card => card && observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className={styles.statsStrip} aria-label="App stats">
        <StatItem target={28400} label="Tasks completed" />
        <StatItem target={12500} label="Active users" />
        <StatItem target={84} label="Completion rate" suffix="%" />
        <StatItem target={98000} label="Streaks tracked" />
      </div>

      <section id="features" className={styles.features}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <p className={styles.sectionLabel}>Features</p>
          <h2 className={styles.sectionHeadline}>Everything you need to stay on track</h2>
          <p className={styles.sectionSub} style={{ margin: '0 auto' }}>
            Simple yet powerful tools to build habits, track tasks, and watch your progress grow every single day.
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div 
              key={f.id} 
              ref={el => { cardsRef.current[i] = el; }}
              className={styles.featureCard}
            >
              <div className={styles.featureIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  {f.icon}
                </svg>
              </div>
              <div className={styles.featureTitle}>{f.title}</div>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function StatItem({ target, label, suffix = "" }: { target: number, label: string, suffix?: string }) {
  const { count, elementRef } = useCountUp(target, 1800, suffix);
  return (
    <div className={styles.statItem} ref={elementRef}>
      <div className={styles.statValue}>{count}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
