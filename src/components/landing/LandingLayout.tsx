import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./Landing.module.css";
import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { StorySection } from "./StorySection";
import { CTASection } from "./CTASection";
import { Footer } from "./Footer";

export default function LandingLayout() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={styles.landingContainer}>
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
        <Link to="/landing" className={styles.navLogo}>
          <img src="/landing/logo.png" alt="Momentum" />
        </Link>
        <ul className={styles.navLinks}>
          <li><a href="#features">Features</a></li>
          <li><a href="#journey">How it works</a></li>
          <li><a href="#cta">Pricing</a></li>
        </ul>
        <Link to="/login" className={styles.navCta}>
          Get started
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </Link>
      </nav>

      <main>
        <HeroSection />
        <FeaturesSection />
        <StorySection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
