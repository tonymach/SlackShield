/**
 * Hero Variant B - "Emotional" - Work-life balance focus
 * Focus: Burnout prevention, mental health, family time
 */
function HeroVariantB({ onCTAClick }) {
  return (
    <section className="hero variant-b">
      <div className="hero-content">
        <h1 className="hero-title">
          Reclaim Your <span className="highlight">Evening and Weekends</span>
        </h1>
        <p className="hero-subtitle">
          Stop letting work messages interrupt dinner, family time, and sleep.
          SlackShield automatically silences work notifications and sends professional auto-responses
          so you can truly disconnect.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-number">73%</div>
            <div className="stat-label">feel pressured to respond after-hours</div>
          </div>
          <div className="stat">
            <div className="stat-number">2.3hrs</div>
            <div className="stat-label">average time lost to evening work</div>
          </div>
        </div>
        <div className="hero-cta">
          <button
            className="btn btn-primary btn-large"
            onClick={() => onCTAClick('hero_primary')}
          >
            Start Protecting My Time
          </button>
          <p className="cta-subtext">Join 1,000+ professionals reclaiming their boundaries</p>
        </div>
      </div>
    </section>
  )
}

export default HeroVariantB
