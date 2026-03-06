import styles from "./Landing.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div>
          <div className={styles.footerBrand}>Momentum</div>
          <p className={styles.footerTagline}>Track tasks. Celebrate progress. Build your momentum.</p>
        </div>
        <ul className={styles.footerLinks}>
          <li><a href="#features">Features</a></li>
          <li><a href="#cta">Pricing</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Twitter / X</a></li>
        </ul>
      </div>
      <div className={styles.footerBottom}>
        <span>© 2026 Momentum. All rights reserved.</span>
        <span>Made with love for makers</span>
      </div>
    </footer>
  );
}
