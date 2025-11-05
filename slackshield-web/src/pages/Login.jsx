import './Login.css'

export default function Login() {
  const handleSlackLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/slack`
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card card">
          <div className="login-header">
            <h1>🛡️ SlackShield</h1>
            <p className="tagline">Protect your off-hours, prevent burnout</p>
          </div>

          <div className="login-content">
            <h2>Take back control of your time</h2>
            <ul className="features-list">
              <li>✅ Automatic DND enforcement during off-hours</li>
              <li>✅ Auto-respond to boundary violators</li>
              <li>✅ Track who respects your time (and who doesn't)</li>
              <li>✅ Generate accountability reports</li>
            </ul>

            <button className="btn-slack" onClick={handleSlackLogin}>
              <svg viewBox="0 0 122.8 122.8" width="20" height="20">
                <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"/>
                <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"/>
                <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"/>
                <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"/>
              </svg>
              Connect with Slack
            </button>

            <p className="privacy-note">
              We'll never send messages on your behalf without your explicit permission.
            </p>
          </div>
        </div>

        <div className="login-footer">
          <p>SlackShield • Protect your boundaries, prevent burnout</p>
        </div>
      </div>
    </div>
  )
}
