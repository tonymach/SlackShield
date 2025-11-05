import Cookies from 'js-cookie'
import api from '../services/api'

/**
 * Generate a unique anonymous ID for tracking
 * @returns {string} - UUID v4
 */
export function generateAnonymousId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get or create anonymous ID from cookie
 * @returns {string} - Anonymous ID
 */
export function getAnonymousId() {
  let anonymousId = Cookies.get('slackshield_anon_id')

  if (!anonymousId) {
    anonymousId = generateAnonymousId()
    // Set cookie for 1 year
    Cookies.set('slackshield_anon_id', anonymousId, { expires: 365 })
  }

  return anonymousId
}

/**
 * Get variant assignment for an experiment
 * @param {string} experimentName - Name of the experiment
 * @returns {Promise<Object>} - Variant data
 */
export async function getVariant(experimentName) {
  const anonymousId = getAnonymousId()

  try {
    const response = await api.get(`/experiments/${experimentName}/variant`, {
      params: { anonymousId }
    })

    return response.data
  } catch (error) {
    console.error('Failed to get variant:', error)
    // Return control variant on error
    return {
      variant: { name: 'control', config: {} },
      isIncluded: false
    }
  }
}

/**
 * Track an experiment event
 * @param {string} experimentName - Name of the experiment
 * @param {string} eventType - Type of event (view, click, signup, conversion)
 * @param {string|null} eventName - Specific event name
 * @param {Object|null} eventData - Additional event data
 * @returns {Promise<void>}
 */
export async function trackEvent(experimentName, eventType, eventName = null, eventData = null) {
  const anonymousId = getAnonymousId()

  try {
    await api.post(`/experiments/${experimentName}/event`, {
      anonymousId,
      eventType,
      eventName,
      eventData
    })
  } catch (error) {
    console.error('Failed to track event:', error)
  }
}

/**
 * Track page view
 * @param {string} experimentName - Name of the experiment
 * @param {string} pageName - Name of the page
 * @returns {Promise<void>}
 */
export function trackPageView(experimentName, pageName) {
  return trackEvent(experimentName, 'view', pageName)
}

/**
 * Track CTA click
 * @param {string} experimentName - Name of the experiment
 * @param {string} ctaName - Name of the CTA button
 * @returns {Promise<void>}
 */
export function trackCTAClick(experimentName, ctaName) {
  return trackEvent(experimentName, 'click', ctaName)
}

/**
 * Track signup
 * @param {string} experimentName - Name of the experiment
 * @returns {Promise<void>}
 */
export function trackSignup(experimentName) {
  return trackEvent(experimentName, 'signup')
}

/**
 * Track conversion
 * @param {string} experimentName - Name of the experiment
 * @param {Object} conversionData - Conversion metadata
 * @returns {Promise<void>}
 */
export function trackConversion(experimentName, conversionData = {}) {
  return trackEvent(experimentName, 'conversion', null, conversionData)
}
