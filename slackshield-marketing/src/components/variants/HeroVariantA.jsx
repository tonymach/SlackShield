/**
 * Hero Variant A - "Control" - Professional and straightforward
 * Focus: Boundary enforcement, professionalism
 */
function HeroVariantA({ onCTAClick }) {
  return (
    <section className="hero variant-a">
      <div className="hero-content">
        <h1 className="hero-title">
          Protect Your <span className="highlight">After-Hours</span> Boundaries
        </h1>
        <p className="hero-subtitle">
          SlackShield automatically blocks notifications and responds to messages during your off-hours.
          Set your boundaries, enforce them automatically, and track violators with accountability reports.
        </p>
        <div className="hero-cta">
          <button
            className="btn btn-primary btn-large"
            onClick={() => onCTAClick('hero_primary')}
          >
            Connect with Slack
          </button>
          <p className="cta-subtext">Free for individuals • No credit card required</p>
        </div>
        <div className="hero-image">
          <div className="mockup-container">
            <div className="mockup-slack">
              <div className="mockup-header">
                <span className="mockup-status">🔴</span>
                <span className="mockup-status-text">Off-hours protection active</span>
              </div>
              <div className="mockup-message">
                <div className="mockup-avatar">👤</div>
                <div className="mockup-content">
                  <div className="mockup-name">Manager</div>
                  <div className="mockup-text">Hey, quick question about the project...</div>
                </div>
              </div>
              <div className="mockup-auto-response">
                <div className="mockup-avatar bot">🛡️</div>
                <div className="mockup-content">
                  <div className="mockup-name">SlackShield (Auto-Response)</div>
                  <div className="mockup-text">
                    I'm currently off the clock (6 PM - 8 AM). I'll respond during working hours.
                    For urgent matters, please contact [emergency contact].
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroVariantA
