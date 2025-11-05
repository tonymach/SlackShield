/**
 * Hero Variant D - "Feature-Benefit" - What you get
 * Focus: Features, social proof, trust signals
 */
function HeroVariantD({ onCTAClick }) {
  return (
    <section className="hero variant-d">
      <div className="hero-content">
        <div className="trust-badge">
          ⭐⭐⭐⭐⭐ <span>4.9/5 from 200+ users</span>
        </div>
        <h1 className="hero-title">
          The <span className="highlight">Automated Boundary System</span> for Slack
        </h1>
        <p className="hero-subtitle">
          Set your off-hours schedule once, and SlackShield handles the rest—automatically.
        </p>
        <div className="benefit-grid">
          <div className="benefit">
            <div className="benefit-icon">🛡️</div>
            <div className="benefit-title">Auto-Protection</div>
            <div className="benefit-text">Blocks notifications during your off-hours</div>
          </div>
          <div className="benefit">
            <div className="benefit-icon">💬</div>
            <div className="benefit-title">Auto-Responses</div>
            <div className="benefit-text">Sends professional replies automatically</div>
          </div>
          <div className="benefit">
            <div className="benefit-icon">📊</div>
            <div className="benefit-title">Accountability Reports</div>
            <div className="benefit-text">Track violators with weekly analytics</div>
          </div>
          <div className="benefit">
            <div className="benefit-icon">⚙️</div>
            <div className="benefit-title">Custom Schedules</div>
            <div className="benefit-text">Different hours for weekdays & weekends</div>
          </div>
        </div>
        <div className="hero-cta">
          <button
            className="btn btn-primary btn-large"
            onClick={() => onCTAClick('hero_primary')}
          >
            Get SlackShield Free
          </button>
          <p className="cta-subtext">2-minute setup • Works with any Slack workspace</p>
        </div>
        <div className="testimonial">
          <p className="testimonial-text">
            "SlackShield gave me my evenings back. I no longer feel guilty about not responding
            to work messages at 10 PM—the auto-response handles it professionally."
          </p>
          <p className="testimonial-author">— Sarah K., Product Manager</p>
        </div>
      </div>
    </section>
  )
}

export default HeroVariantD
