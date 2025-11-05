/**
 * Pricing Section
 */
function Pricing({ onCTAClick }) {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for individuals',
      features: [
        '1 Slack workspace',
        'Unlimited schedules',
        'Auto-responses',
        'Basic violation tracking',
        'Email support'
      ],
      cta: 'Get Started Free',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$9',
      period: 'per month',
      description: 'For power users',
      features: [
        'Up to 3 workspaces',
        'Advanced analytics',
        'Custom report exports',
        'Priority support',
        'API access',
        'Slack report integration'
      ],
      cta: 'Start Pro Trial',
      highlighted: true
    },
    {
      name: 'Team',
      price: '$29',
      period: 'per month',
      description: 'For teams and managers',
      features: [
        'Unlimited workspaces',
        'Team dashboard',
        'Centralized reporting',
        'HR-ready exports',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantees'
      ],
      cta: 'Contact Sales',
      highlighted: false
    }
  ]

  return (
    <section className="pricing">
      <div className="container">
        <h2 className="section-title">Simple, Transparent Pricing</h2>
        <p className="section-subtitle">Start free. Upgrade when you need more.</p>
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
              {plan.highlighted && <div className="popular-badge">Most Popular</div>}
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">
                {plan.price}
                <span className="plan-period">/{plan.period}</span>
              </div>
              <div className="plan-description">{plan.description}</div>
              <ul className="plan-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}>
                    <span className="check-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} btn-block`}
                onClick={() => onCTAClick(`pricing_${plan.name.toLowerCase()}`)}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
        <p className="pricing-note">
          All plans include 14-day free trial • No credit card required • Cancel anytime
        </p>
      </div>
    </section>
  )
}

export default Pricing
