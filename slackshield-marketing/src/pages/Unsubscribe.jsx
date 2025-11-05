import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'

/**
 * Unsubscribe Page - Handle email unsubscriptions
 */
function Unsubscribe() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [category, setCategory] = useState('all')
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const categoryParam = searchParams.get('category') || 'all'

    if (emailParam) {
      setEmail(emailParam)
      setCategory(categoryParam)
      setStatus('ready')
    } else {
      setStatus('error')
    }
  }, [searchParams])

  const handleUnsubscribe = async () => {
    try {
      setStatus('submitting')

      await api.post('/email/unsubscribe', {
        email,
        category,
        reason
      })

      setStatus('success')
    } catch (error) {
      console.error('Unsubscribe error:', error)
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="unsubscribe-page">
        <div className="container">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="unsubscribe-page">
        <div className="container">
          <div className="unsubscribe-success">
            <h1>✓ You've been unsubscribed</h1>
            <p>We've removed <strong>{email}</strong> from {category === 'all' ? 'all' : category} emails.</p>
            <p>You will no longer receive these emails from SlackShield.</p>
            <a href="/" className="btn btn-primary">Return to Homepage</a>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="unsubscribe-page">
        <div className="container">
          <div className="unsubscribe-error">
            <h1>⚠️ Something went wrong</h1>
            <p>We couldn't process your unsubscribe request. Please contact support.</p>
            <a href="mailto:support@slackshield.com" className="btn btn-secondary">Contact Support</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="unsubscribe-page">
      <div className="container">
        <div className="unsubscribe-form">
          <h1>Unsubscribe from SlackShield Emails</h1>
          <p>We're sorry to see you go! You're about to unsubscribe <strong>{email}</strong> from:</p>

          <div className="category-select">
            <label>
              <input
                type="radio"
                value="all"
                checked={category === 'all'}
                onChange={(e) => setCategory(e.target.value)}
              />
              All emails
            </label>
            <label>
              <input
                type="radio"
                value="marketing"
                checked={category === 'marketing'}
                onChange={(e) => setCategory(e.target.value)}
              />
              Marketing emails only
            </label>
            <label>
              <input
                type="radio"
                value="onboarding"
                checked={category === 'onboarding'}
                onChange={(e) => setCategory(e.target.value)}
              />
              Onboarding emails only
            </label>
            <label>
              <input
                type="radio"
                value="notifications"
                checked={category === 'notifications'}
                onChange={(e) => setCategory(e.target.value)}
              />
              Notification emails only
            </label>
          </div>

          <div className="reason-field">
            <label>Why are you unsubscribing? (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Your feedback helps us improve..."
              rows={4}
            />
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={handleUnsubscribe}
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Processing...' : 'Unsubscribe'}
          </button>

          <p className="note">
            Note: You'll still receive important account and security notifications even if you unsubscribe from all emails.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Unsubscribe
