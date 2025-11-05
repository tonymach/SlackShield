import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AuthCallback() {
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setStatus('error')
      setError('Slack authentication was cancelled or failed')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    if (code) {
      // Exchange code for token via backend
      exchangeCodeForToken(code)
    } else {
      setStatus('error')
      setError('No authorization code received')
      setTimeout(() => navigate('/login'), 3000)
    }
  }, [searchParams, navigate])

  const exchangeCodeForToken = async (code) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/slack/callback?code=${code}`,
        {
          credentials: 'include'
        }
      )

      if (response.ok) {
        const data = await response.json()
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem('slackshield_token', data.token)
        }
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 1500)
      } else {
        const errorData = await response.json()
        setStatus('error')
        setError(errorData.message || 'Failed to connect Slack workspace')
        setTimeout(() => navigate('/login'), 3000)
      }
    } catch (err) {
      console.error('Auth error:', err)
      setStatus('error')
      setError('Network error. Please try again.')
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  return (
    <div className="auth-callback-page">
      <div className="container">
        <div className="card" style={{ textAlign: 'center', maxWidth: '500px', margin: '100px auto' }}>
          {status === 'processing' && (
            <>
              <h2>🔄 Connecting to Slack...</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>
                Please wait while we set up your SlackShield account
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <h2>✅ Successfully Connected!</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>
                Redirecting to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <h2>❌ Connection Failed</h2>
              <p style={{ color: 'var(--danger-color)', marginTop: '16px' }}>
                {error}
              </p>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                Redirecting back to login...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
