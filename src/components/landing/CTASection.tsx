import styles from "./Landing.module.css";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section id="cta" className={styles.cta}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        Your next step
      </p>
      <h2 className={styles.ctaHeadline}>
        Ready to build<br />your momentum?
      </h2>
      <p className={styles.ctaSub}>
        Join thousands of people turning their daily chaos into structured, rewarding progress. Free to start, no credit card needed.
      </p>
      <div className={styles.ctaActions}>
        <Link to="/login" className={styles.btnPrimaryInv}>
          Start for free
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <p className={styles.ctaNote}>Free forever tier available · Premium from $5/mo</p>
      </div>
    </section>
  );
}
