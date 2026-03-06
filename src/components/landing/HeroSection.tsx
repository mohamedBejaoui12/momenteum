import { Link } from "react-router-dom";
import styles from "./Landing.module.css";

export function HeroSection() {
  return (
    <section id="hero" className={styles.hero}>
      {/* Organic knot SVG: knot pre-drawn, tail animates on scroll */}
      <KnotSVG />

      <div className={`${styles.heroBadge} ${styles.heroFadeUp}`} style={{ animationDelay: '0s' }}>
        <span className={styles.heroBadgeDot}></span>
        Now in public beta
      </div>

      <h1 className={`${styles.heroHeadline} ${styles.heroFadeUp}`} style={{ animationDelay: '0.08s' }}>
        Track tasks.<br /><span className={styles.accent}>Celebrate</span> every win.
      </h1>

      <p className={`${styles.heroSub} ${styles.heroFadeUp}`} style={{ animationDelay: '0.16s' }}>
        Momentum turns your daily chaos into structured progress — trackable, rewarding, and built to keep you moving forward.
      </p>

      <div className={`${styles.heroActions} ${styles.heroFadeUp}`} style={{ animationDelay: '0.24s' }}>
        <Link to="/login" className={styles.btnPrimary}>
          Start for free
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </Link>
        <a href="#features" className={styles.btnGhost}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <polygon points="3,2 11,7 3,12" fill="currentColor" />
          </svg>
          See how it works
        </a>
      </div>

      {/* App mockup */}
      <div className={`${styles.heroMockup} ${styles.heroFadeUp}`} style={{ animationDelay: '0.32s' }} aria-label="App preview">
        <div className={styles.mockupBar}>
          <div className={`${styles.mockupDot} ${styles.mockupDotRed}`}></div>
          <div className={`${styles.mockupDot} ${styles.mockupDotYellow}`}></div>
          <div className={`${styles.mockupDot} ${styles.mockupDotGreen}`}></div>
        </div>
        <div className={styles.mockupInner}>
          <div className={styles.mockupSidebar}>
            <div className={styles.mockupLogoBar}></div>
            <div className={`${styles.mockupNavItem} ${styles.mockupNavItemActive}`}></div>
            <div className={styles.mockupNavItem}></div>
            <div className={styles.mockupNavItem}></div>
            <div className={styles.mockupNavItem}></div>
            <div className={styles.mockupNavItem}></div>
            <div style={{ flex: 1 }}></div>
            <div className={styles.mockupNavItem} style={{ opacity: 0.3 }}></div>
          </div>
          <div className={styles.mockupMain}>
            <div className={styles.mockupHeadingRow}></div>
            <div className={styles.mockupStatRow}>
              <div className={styles.mockupStat}>
                <div className={styles.mockupStatLabel}></div>
                <div className={styles.mockupStatValue}></div>
              </div>
              <div className={styles.mockupStat}>
                <div className={styles.mockupStatLabel}></div>
                <div className={`${styles.mockupStatValue} ${styles.mockupStatValueGreen}`}></div>
              </div>
              <div className={styles.mockupStat}>
                <div className={styles.mockupStatLabel}></div>
                <div className={styles.mockupStatValue} style={{ background: 'var(--landing-gray-300)' }}></div>
              </div>
            </div>
            <div className={styles.mockupTasks}>
              <div className={styles.mockupTask}><div className={`${styles.mockupTaskCheck} ${styles.mockupTaskCheckDone}`}></div><div className={styles.mockupTaskText}></div></div>
              <div className={styles.mockupTask}><div className={`${styles.mockupTaskCheck} ${styles.mockupTaskCheckDone}`}></div><div className={`${styles.mockupTaskText} ${styles.mockupTaskTextShort}`}></div></div>
              <div className={styles.mockupTask}><div className={styles.mockupTaskCheck}></div><div className={styles.mockupTaskText}></div></div>
              <div className={styles.mockupTask} style={{ opacity: 0.5 }}><div className={styles.mockupTaskCheck}></div><div className={`${styles.mockupTaskText} ${styles.mockupTaskTextShort}`}></div></div>
            </div>
            <div className={styles.mockupProgress} style={{ marginTop: 'auto' }}>
              <div className={styles.mockupProgressFill}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KnotSVG() {
  useEffect(() => {
    const knotPath = document.getElementById('hero-knot-path') as unknown as SVGPathElement;
    if (knotPath) {
      const L = knotPath.getTotalLength();
      const PRE_DRAW = 0.70;
      knotPath.style.strokeDasharray = L.toString();
      knotPath.style.strokeDashoffset = (L * (1 - PRE_DRAW)).toString();
      
      const handleScroll = () => {
        const progress = Math.min(Math.max(window.scrollY / (window.innerHeight * 1.5), 0), 1);
        knotPath.style.strokeDashoffset = (L * (1 - PRE_DRAW) * (1 - progress)).toString();
      };
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <svg className={styles.heroKnotSvg} viewBox="0 0 1278 2319" fill="none" overflow="visible" aria-hidden="true">
      <path id="hero-knot-path"
        d="M876.605 394.131C788.982 335.917 696.198 358.139 691.836 416.303C685.453 501.424 853.722 498.43 941.95 409.714C1016.1 335.156 1008.64 186.907 906.167 142.846C807.014 100.212 712.699 198.494 789.049 245.127C889.053 306.207 986.062 116.979 840.548 43.3233C743.932 -5.58141 678.027 57.1682 672.279 112.188C666.53 167.208 712.538 172.943 736.353 163.088C760.167 153.234 764.14 120.924 746.651 93.3868C717.461 47.4252 638.894 77.8642 601.018 116.979C568.164 150.908 557 201.079 576.467 246.924C593.342 286.664 630.24 310.55 671.68 302.614C756.114 286.446 729.747 206.546 681.86 186.442C630.54 164.898 492 209.318 495.026 287.644C496.837 334.494 518.402 366.466 582.455 367.287C680.013 368.538 771.538 299.456 898.634 292.434C1007.02 286.446 1192.67 309.384 1242.36 382.258C1266.99 418.39 1273.65 443.108 1247.75 474.477C1217.32 511.33 1149.4 511.259 1096.84 466.093C1044.29 420.928 1029.14 380.576 1033.97 324.172C1038.31 273.428 1069.55 228.986 1117.2 216.384C1152.2 207.128 1188.29 213.629 1194.45 245.127C1201.49 281.062 1132.22 280.104 1100.44 272.673C1065.32 264.464 1044.22 234.837 1032.77 201.413C1019.29 162.061 1029.71 131.126 1056.44 100.965C1086.19 67.4032 1143.96 54.5526 1175.78 86.1513C1207.02 117.17 1186.81 143.379 1156.22 166.691C1112.57 199.959 1052.57 186.238 999.784 155.164C957.312 130.164 899.171 63.7054 931.284 26.3214C952.068 2.12513 996.288 3.87363 1007.22 43.58C1018.15 83.2749 1003.56 122.644 975.969 163.376C948.377 204.107 907.272 255.122 913.558 321.045C919.727 385.734 990.968 497.068 1063.84 503.35C1111.46 507.456 1166.79 511.984 1175.68 464.527C1191.52 379.956 1101.26 334.985 1030.29 377.017C971.109 412.064 956.297 483.647 953.797 561.655C947.587 755.413 1197.56 941.828 936.039 1140.66C745.771 1285.32 321.926 950.737 134.536 1202.19C-6.68295 1391.68 -53.4837 1655.38 131.935 1760.5C478.381 1956.91 1124.19 1515 1201.28 1997.83C1273.66 2451.23 100.805 1864.7 303.794 2668.89"
        stroke="#111827"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

import { useEffect } from "react";
