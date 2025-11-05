import crypto from 'crypto'
import pool from '../database/db.js'

/**
 * A/B/C/D Testing Service
 *
 * Provides consistent bucketing, variant assignment, and event tracking
 * for experiments across landing pages, emails, and features.
 */

/**
 * Hash-based consistent bucketing algorithm
 * Ensures the same user always gets the same variant for an experiment
 *
 * @param {string} experimentId - UUID of the experiment
 * @param {string} userId - User ID or anonymous ID
 * @returns {number} - Hash value between 0 and 1
 */
export function hashBucket(experimentId, userId) {
  const input = `${experimentId}:${userId}`
  const hash = crypto.createHash('sha256').update(input).digest('hex')
  // Convert first 8 hex characters to decimal and normalize to 0-1
  const hashInt = parseInt(hash.substring(0, 8), 16)
  return hashInt / 0xFFFFFFFF
}

/**
 * Assign user to a variant based on traffic weights
 *
 * @param {Array} variants - Array of variant objects with traffic_weight
 * @param {number} bucketValue - Value between 0 and 1 from hashBucket
 * @returns {Object} - Selected variant
 */
export function selectVariant(variants, bucketValue) {
  if (!variants || variants.length === 0) {
    throw new Error('No variants available')
  }

  // Calculate total weight
  const totalWeight = variants.reduce((sum, v) => sum + v.traffic_weight, 0)

  if (totalWeight === 0) {
    throw new Error('Total traffic weight cannot be zero')
  }

  // Find variant based on bucket value
  let cumulativeWeight = 0
  for (const variant of variants) {
    cumulativeWeight += variant.traffic_weight
    const threshold = cumulativeWeight / totalWeight

    if (bucketValue <= threshold) {
      return variant
    }
  }

  // Fallback to last variant (should never happen with proper math)
  return variants[variants.length - 1]
}

/**
 * Get or create variant assignment for a user
 *
 * @param {string} experimentName - Name of the experiment
 * @param {string|null} userId - User UUID (null for anonymous)
 * @param {string|null} anonymousId - Anonymous ID (null for logged-in users)
 * @returns {Promise<Object>} - Variant configuration
 */
export async function getVariant(experimentName, userId = null, anonymousId = null) {
  const client = await pool.connect()

  try {
    // Get experiment
    const experimentResult = await client.query(
      `SELECT id, status, traffic_allocation
       FROM experiments
       WHERE name = $1 AND status = 'running'`,
      [experimentName]
    )

    if (experimentResult.rows.length === 0) {
      throw new Error(`Experiment '${experimentName}' not found or not running`)
    }

    const experiment = experimentResult.rows[0]

    // Check if user should be included based on traffic allocation
    const identifier = userId || anonymousId
    if (!identifier) {
      throw new Error('Either userId or anonymousId must be provided')
    }

    const allocationBucket = hashBucket(experiment.id, identifier)
    if (allocationBucket > parseFloat(experiment.traffic_allocation)) {
      // User not included in experiment - return control
      const controlResult = await client.query(
        `SELECT id, name, description, config, is_control
         FROM experiment_variants
         WHERE experiment_id = $1 AND is_control = true
         LIMIT 1`,
        [experiment.id]
      )

      if (controlResult.rows.length === 0) {
        throw new Error('No control variant found')
      }

      return {
        experimentId: experiment.id,
        variant: controlResult.rows[0],
        isIncluded: false
      }
    }

    // Check if user already has an assignment
    const assignmentQuery = userId
      ? 'SELECT variant_id FROM experiment_assignments WHERE experiment_id = $1 AND user_id = $2'
      : 'SELECT variant_id FROM experiment_assignments WHERE experiment_id = $1 AND anonymous_id = $2'

    const existingAssignment = await client.query(
      assignmentQuery,
      [experiment.id, userId || anonymousId]
    )

    let variantId

    if (existingAssignment.rows.length > 0) {
      // Return existing assignment
      variantId = existingAssignment.rows[0].variant_id
    } else {
      // Create new assignment
      const variantsResult = await client.query(
        `SELECT id, name, description, config, traffic_weight, is_control
         FROM experiment_variants
         WHERE experiment_id = $1
         ORDER BY name`,
        [experiment.id]
      )

      const variants = variantsResult.rows
      const bucketValue = hashBucket(experiment.id, identifier)
      const selectedVariant = selectVariant(variants, bucketValue)

      // Insert assignment
      const insertQuery = userId
        ? 'INSERT INTO experiment_assignments (experiment_id, variant_id, user_id) VALUES ($1, $2, $3) RETURNING id, variant_id'
        : 'INSERT INTO experiment_assignments (experiment_id, variant_id, anonymous_id) VALUES ($1, $2, $3) RETURNING id, variant_id'

      const insertResult = await client.query(
        insertQuery,
        [experiment.id, selectedVariant.id, userId || anonymousId]
      )

      variantId = insertResult.rows[0].variant_id
    }

    // Get variant details
    const variantResult = await client.query(
      `SELECT id, name, description, config, is_control
       FROM experiment_variants
       WHERE id = $1`,
      [variantId]
    )

    return {
      experimentId: experiment.id,
      variant: variantResult.rows[0],
      isIncluded: true
    }

  } finally {
    client.release()
  }
}

/**
 * Track an event for an experiment
 *
 * @param {string} experimentName - Name of the experiment
 * @param {string|null} userId - User UUID
 * @param {string|null} anonymousId - Anonymous ID
 * @param {string} eventType - Type of event (view, click, signup, conversion)
 * @param {string|null} eventName - Specific event name
 * @param {Object|null} eventData - Additional event data
 * @returns {Promise<Object>} - Created event
 */
export async function trackEvent(experimentName, userId, anonymousId, eventType, eventName = null, eventData = null) {
  const client = await pool.connect()

  try {
    // Get experiment
    const experimentResult = await client.query(
      'SELECT id FROM experiments WHERE name = $1',
      [experimentName]
    )

    if (experimentResult.rows.length === 0) {
      throw new Error(`Experiment '${experimentName}' not found`)
    }

    const experimentId = experimentResult.rows[0].id

    // Get assignment
    const assignmentQuery = userId
      ? 'SELECT id, variant_id FROM experiment_assignments WHERE experiment_id = $1 AND user_id = $2'
      : 'SELECT id, variant_id FROM experiment_assignments WHERE experiment_id = $1 AND anonymous_id = $2'

    const assignmentResult = await client.query(
      assignmentQuery,
      [experimentId, userId || anonymousId]
    )

    if (assignmentResult.rows.length === 0) {
      throw new Error('No assignment found for user')
    }

    const assignment = assignmentResult.rows[0]

    // Insert event
    const eventResult = await client.query(
      `INSERT INTO experiment_events (experiment_id, variant_id, assignment_id, event_type, event_name, event_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, occurred_at`,
      [experimentId, assignment.variant_id, assignment.id, eventType, eventName, eventData ? JSON.stringify(eventData) : null]
    )

    return eventResult.rows[0]

  } finally {
    client.release()
  }
}

/**
 * Get experiment results with statistical significance
 *
 * @param {string} experimentName - Name of the experiment
 * @returns {Promise<Object>} - Experiment results with stats
 */
export async function getExperimentResults(experimentName) {
  const client = await pool.connect()

  try {
    const result = await client.query(
      `SELECT * FROM experiment_results WHERE experiment_name = $1`,
      [experimentName]
    )

    if (result.rows.length === 0) {
      return { error: 'No results found' }
    }

    const variants = result.rows

    // Calculate statistical significance (simplified z-test for proportions)
    const control = variants.find(v => v.is_control)
    const treatments = variants.filter(v => !v.is_control)

    const results = {
      experimentName,
      status: variants[0].status,
      control: {
        variant: control.variant_name,
        assignments: parseInt(control.assignments),
        conversions: parseInt(control.conversions),
        conversionRate: parseFloat(control.conversion_rate)
      },
      treatments: treatments.map(treatment => {
        const p1 = parseFloat(control.conversion_rate) / 100
        const p2 = parseFloat(treatment.conversion_rate) / 100
        const n1 = parseInt(control.assignments)
        const n2 = parseInt(treatment.assignments)

        // Calculate z-score
        const p = ((p1 * n1) + (p2 * n2)) / (n1 + n2)
        const se = Math.sqrt(p * (1 - p) * ((1 / n1) + (1 / n2)))
        const zScore = se === 0 ? 0 : (p2 - p1) / se

        // Calculate p-value (two-tailed)
        const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

        // Determine significance
        const isSignificant = pValue < 0.05
        const lift = p1 === 0 ? null : ((p2 - p1) / p1) * 100

        return {
          variant: treatment.variant_name,
          assignments: parseInt(treatment.assignments),
          conversions: parseInt(treatment.conversions),
          conversionRate: parseFloat(treatment.conversion_rate),
          lift: lift ? lift.toFixed(2) + '%' : 'N/A',
          zScore: zScore.toFixed(4),
          pValue: pValue.toFixed(4),
          isSignificant,
          confidence: isSignificant ? '95%+' : 'Not significant'
        }
      })
    }

    return results

  } finally {
    client.release()
  }
}

/**
 * Normal cumulative distribution function (for p-value calculation)
 * Approximation using error function
 */
function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)))
}

/**
 * Error function approximation (Abramowitz and Stegun)
 */
function erf(x) {
  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)

  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return sign * y
}

/**
 * Create a new experiment
 *
 * @param {Object} experiment - Experiment configuration
 * @returns {Promise<Object>} - Created experiment
 */
export async function createExperiment(experiment) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Create experiment
    const expResult = await client.query(
      `INSERT INTO experiments (name, description, type, status, traffic_allocation)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, type, status, traffic_allocation, created_at`,
      [experiment.name, experiment.description, experiment.type, 'draft', experiment.trafficAllocation || 1.0]
    )

    const createdExperiment = expResult.rows[0]

    // Create variants
    const variants = experiment.variants || []
    const createdVariants = []

    for (const variant of variants) {
      const variantResult = await client.query(
        `INSERT INTO experiment_variants (experiment_id, name, description, config, traffic_weight, is_control)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, description, config, traffic_weight, is_control`,
        [
          createdExperiment.id,
          variant.name,
          variant.description || null,
          variant.config ? JSON.stringify(variant.config) : null,
          variant.trafficWeight || 1,
          variant.isControl || false
        ]
      )
      createdVariants.push(variantResult.rows[0])
    }

    await client.query('COMMIT')

    return {
      experiment: createdExperiment,
      variants: createdVariants
    }

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Start an experiment (change status to 'running')
 *
 * @param {string} experimentName - Name of the experiment
 * @returns {Promise<Object>} - Updated experiment
 */
export async function startExperiment(experimentName) {
  const result = await pool.query(
    `UPDATE experiments
     SET status = 'running', started_at = NOW(), updated_at = NOW()
     WHERE name = $1
     RETURNING id, name, status, started_at`,
    [experimentName]
  )

  if (result.rows.length === 0) {
    throw new Error('Experiment not found')
  }

  return result.rows[0]
}

/**
 * Stop an experiment (change status to 'completed')
 *
 * @param {string} experimentName - Name of the experiment
 * @returns {Promise<Object>} - Updated experiment
 */
export async function stopExperiment(experimentName) {
  const result = await pool.query(
    `UPDATE experiments
     SET status = 'completed', ended_at = NOW(), updated_at = NOW()
     WHERE name = $1
     RETURNING id, name, status, ended_at`,
    [experimentName]
  )

  if (result.rows.length === 0) {
    throw new Error('Experiment not found')
  }

  return result.rows[0]
}
