/**
 * Features Section - Common across all variants
 */
function Features() {
  const features = [
    {
      icon: '🕐',
      title: 'Custom Schedules',
      description: 'Set different off-hours for weekdays, weekends, and holidays. Define your boundaries exactly how you need them.'
    },
    {
      icon: '🔕',
      title: 'Automatic DND',
      description: 'SlackShield automatically activates Do Not Disturb mode during your off-hours. No manual toggling needed.'
    },
    {
      icon: '💬',
      title: 'Auto-Responses',
      description: 'Professional auto-replies sent to anyone who messages you during off-hours. Customizable templates.'
    },
    {
      icon: '📊',
      title: 'Violation Tracking',
      description: 'See who\'s contacting you after-hours with detailed analytics. Export reports for HR or management.'
    },
    {
      icon: '👥',
      title: 'Team Management',
      description: 'Team plan lets you enforce boundaries across your entire department with centralized reporting.'
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      description: 'Bank-level encryption, SOC 2 compliance, and audit logging. Your data is always protected.'
    }
  ]

  return (
    <section className="features">
      <div className="container">
        <h2 className="section-title">Everything You Need to Protect Your Time</h2>
        <p className="section-subtitle">
          Powerful automation that works silently in the background
        </p>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
