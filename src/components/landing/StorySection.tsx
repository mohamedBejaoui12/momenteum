import { useEffect, useRef } from "react";
import styles from "./Landing.module.css";

export function StorySection() {
  const blocksRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.journeyBlockVisible);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    blocksRef.current.forEach(block => block && observer.observe(block));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="journey" className={styles.journey}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <p className={styles.sectionLabel}>How it works</p>
        <h2 className={styles.sectionHeadline}>Built for people who want to actually grow</h2>
      </div>
      <div className={styles.journeyBlocks}>
        {/* Block 1 */}
        <div className={styles.journeyBlock} ref={el => { blocksRef.current[0] = el; }}>
          <div>
            <span className={styles.journeyTag}>Smart Tasks</span>
            <h3 className={styles.journeyTitle}>Capture tasks as fast as you think them</h3>
            <p className={styles.journeyDesc}>Add tasks in seconds, set dates, and organize by type — all in one fluid flow. No friction, no context switching. Your focus stays on the work, not the tool.</p>
          </div>
          <div className={styles.journeyVisual}>
            <div className={styles.visTasks}>
              <div className={styles.visTask}><div className={`${styles.visTaskCheck} ${styles.visTaskCheckDone}`}></div><div className={styles.visTaskBar}></div></div>
              <div className={styles.visTask}><div className={`${styles.visTaskCheck} ${styles.visTaskCheckDone}`}></div><div className={`${styles.visTaskBar} ${styles.visTaskBarShort}`}></div></div>
              <div className={styles.visTask}><div className={styles.visTaskCheck}></div><div className={styles.visTaskBar}></div></div>
              <div className={styles.visTask} style={{ opacity: 0.4 }}><div className={styles.visTaskCheck}></div><div className={`${styles.visTaskBar} ${styles.visTaskBarShort}`}></div></div>
            </div>
          </div>
        </div>

        {/* Block 2 */}
        <div className={`${styles.journeyBlock} ${styles.journeyBlockEven}`} ref={el => { blocksRef.current[1] = el; }}>
          <div>
            <span className={styles.journeyTag}>Visual Progress</span>
            <h3 className={styles.journeyTitle}>See your momentum build in real time</h3>
            <p className={styles.journeyDesc}>Charts, daily summaries, and analytics make your progress undeniable. Every completed task adds to a clearer picture of who you are becoming.</p>
          </div>
          <div className={styles.journeyVisual}>
            <div className={styles.visChart}>
              <div className={styles.visBarRow}>
                <div className={styles.visBar} style={{ height: '40%' }}></div>
                <div className={`${styles.visBar} ${styles.visBarMd}`} style={{ height: '58%' }}></div>
                <div className={`${styles.visBar} ${styles.visBarHi}`} style={{ height: '75%' }}></div>
                <div className={`${styles.visBar} ${styles.visBarMd}`} style={{ height: '50%' }}></div>
                <div className={`${styles.visBar} ${styles.visBarHi}`} style={{ height: '90%' }}></div>
                <div className={styles.visBar} style={{ height: '65%' }}></div>
                <div className={`${styles.visBar} ${styles.visBarHi}`} style={{ height: '100%' }}></div>
              </div>
              <div className={styles.visLabelRow}>
                <div className={styles.visLabel}></div><div className={styles.visLabel}></div>
                <div className={styles.visLabel}></div><div className={styles.visLabel}></div>
                <div className={styles.visLabel}></div><div className={styles.visLabel}></div>
                <div className={styles.visLabel}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Block 3 */}
        <div className={styles.journeyBlock} ref={el => { blocksRef.current[2] = el; }}>
          <div>
            <span className={styles.journeyTag}>Streaks & Habits</span>
            <h3 className={styles.journeyTitle}>Consistency becomes your superpower</h3>
            <p className={styles.journeyDesc}>Daily habit streaks reward your consistency. Badges, milestone alerts, and weekly recaps keep you engaged and motivated — even when the days get hard.</p>
          </div>
          <div className={styles.journeyVisual}>
            <div className={styles.visStreak}>
              <div className={styles.visStreakNum}>14</div>
              <div className={styles.visStreakLbl}>day streak</div>
              <div className={styles.visStreakDots}>
                <div className={styles.visDotOn + " " + styles.visDot}></div>
                <div className={styles.visDotOn + " " + styles.visDot}></div>
                <div className={styles.visDotOn + " " + styles.visDot}></div>
                <div className={styles.visDotOn + " " + styles.visDot}></div>
                <div className={styles.visDotOn + " " + styles.visDot}></div>
                <div className={styles.visDotOn + " " + styles.visDot}></div>
                <div className={styles.visDotToday + " " + styles.visDot}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
