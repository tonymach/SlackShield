/**
 * Footer Component
 */
function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section">
            <h3 className="footer-title">SlackShield</h3>
            <p className="footer-description">
              Protect your after-hours boundaries with automated Slack do-not-disturb enforcement
              and accountability reporting.
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Product</h4>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="/docs">Documentation</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li><a href="/about">About</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/careers">Careers</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Legal</h4>
            <ul className="footer-links">
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/security">Security</a></li>
              <li><a href="/gdpr">GDPR</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Connect</h4>
            <ul className="footer-links">
              <li><a href="https://twitter.com/slackshield" target="_blank" rel="noopener noreferrer">Twitter</a></li>
              <li><a href="https://linkedin.com/company/slackshield" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="https://github.com/slackshield" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="mailto:hello@slackshield.com">Email</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} SlackShield. All rights reserved.
          </p>
          <div className="footer-badges">
            <span className="badge">🔒 SOC 2 Type II</span>
            <span className="badge">🛡️ GDPR Compliant</span>
            <span className="badge">✓ ISO 27001</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
