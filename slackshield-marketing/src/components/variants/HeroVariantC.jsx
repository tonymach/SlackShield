/**
 * Hero Variant C - "Problem-Focused" - Pain point emphasis
 * Focus: The problems SlackShield solves
 */
function HeroVariantC({ onCTAClick }) {
  return (
    <section className="hero variant-c">
      <div className="hero-content">
        <div className="problem-tag">🚨 The Problem</div>
        <h1 className="hero-title">
          Your Slack Is Stealing Your <span className="highlight">Personal Time</span>
        </h1>
        <ul className="problem-list">
          <li>
            <span className="icon">❌</span>
            <span>Work messages at 9 PM, on weekends, during vacation</span>
          </li>
          <li>
            <span className="icon">❌</span>
            <span>Pressure to respond immediately even when off the clock</span>
          </li>
          <li>
            <span className="icon">❌</span>
            <span>No accountability for boundary violators</span>
          </li>
          <li>
            <span className="icon">❌</span>
            <span>Burnout from constant connectivity</span>
          </li>
        </ul>
        <div className="solution-tag">✅ The Solution</div>
        <p className="hero-subtitle">
          SlackShield automatically blocks notifications, sends professional auto-responses,
          and creates violation reports to hold serial offenders accountable.
        </p>
        <div className="hero-cta">
          <button
            className="btn btn-primary btn-large"
            onClick={() => onCTAClick('hero_primary')}
          >
            Fix This Problem Now
          </button>
          <p className="cta-subtext">Setup takes 2 minutes • Free for individuals</p>
        </div>
      </div>
    </section>
  )
}

export default HeroVariantC
