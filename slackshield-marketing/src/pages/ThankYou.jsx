/**
 * Thank You Page - Post-signup confirmation
 */
function ThankYou() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  return (
    <div className="thank-you-page">
      <div className="container">
        <div className="thank-you-content">
          <div className="success-icon">✓</div>
          <h1>Welcome to SlackShield!</h1>
          <p className="subtitle">Your account has been created successfully.</p>

          <div className="next-steps">
            <h2>Next Steps:</h2>
            <ol className="steps-list">
              <li>
                <strong>Connect your Slack workspace</strong>
                <p>Authorize SlackShield to protect your boundaries</p>
              </li>
              <li>
                <strong>Set your off-hours schedule</strong>
                <p>Define when you want to be protected from work messages</p>
              </li>
              <li>
                <strong>Customize your auto-response</strong>
                <p>Write a professional message for boundary violators</p>
              </li>
              <li>
                <strong>Start protecting your time</strong>
                <p>SlackShield works automatically—no manual intervention needed</p>
              </li>
            </ol>
          </div>

          <div className="cta-section">
            <a
              href={`${API_URL}/auth/slack`}
              className="btn btn-primary btn-large"
            >
              Connect Slack Workspace
            </a>
            <p className="cta-note">This takes about 2 minutes</p>
          </div>

          <div className="help-section">
            <h3>Need Help?</h3>
            <ul className="help-links">
              <li><a href="/docs/quick-start">Quick Start Guide</a></li>
              <li><a href="/docs/faq">Frequently Asked Questions</a></li>
              <li><a href="mailto:support@slackshield.com">Contact Support</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThankYou
