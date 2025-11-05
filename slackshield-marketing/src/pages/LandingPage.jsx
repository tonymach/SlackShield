import { useState, useEffect } from 'react'
import { getVariant, trackPageView, trackCTAClick } from '../utils/analytics'
import HeroVariantA from '../components/variants/HeroVariantA'
import HeroVariantB from '../components/variants/HeroVariantB'
import HeroVariantC from '../components/variants/HeroVariantC'
import HeroVariantD from '../components/variants/HeroVariantD'
import Features from '../components/Features'
import Pricing from '../components/Pricing'
import FAQ from '../components/FAQ'
import Footer from '../components/Footer'
import './LandingPage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function LandingPage() {
  const [variant, setVariant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get variant assignment on page load
    async function loadVariant() {
      try {
        const assignment = await getVariant('landing_page_hero')
        setVariant(assignment.variant)

        // Track page view
        await trackPageView('landing_page_hero', 'landing')
      } catch (error) {
        console.error('Failed to load variant:', error)
        // Default to control
        setVariant({ name: 'A', config: {} })
      } finally {
        setLoading(false)
      }
    }

    loadVariant()
  }, [])

  const handleCTAClick = async (ctaName) => {
    await trackCTAClick('landing_page_hero', ctaName)
    // Redirect to Slack OAuth
    window.location.href = `${API_URL}/auth/slack`
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Render hero based on variant
  const renderHero = () => {
    switch (variant?.name) {
      case 'B':
        return <HeroVariantB onCTAClick={handleCTAClick} />
      case 'C':
        return <HeroVariantC onCTAClick={handleCTAClick} />
      case 'D':
        return <HeroVariantD onCTAClick={handleCTAClick} />
      case 'A':
      default:
        return <HeroVariantA onCTAClick={handleCTAClick} />
    }
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      {renderHero()}

      {/* Features Section */}
      <Features />

      {/* Pricing Section */}
      <Pricing onCTAClick={handleCTAClick} />

      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default LandingPage
