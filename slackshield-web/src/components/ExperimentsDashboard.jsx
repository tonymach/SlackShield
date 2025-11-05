import { useState, useEffect } from 'react'
import api from '../services/api'
import './ExperimentsDashboard.css'

/**
 * Experiments Dashboard - View A/B test results
 * Shows experiment performance, variant comparisons, and statistical significance
 */
function ExperimentsDashboard() {
  const [experiments, setExperiments] = useState([])
  const [selectedExperiment, setSelectedExperiment] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchExperiments()
  }, [])

  useEffect(() => {
    if (selectedExperiment) {
      fetchResults(selectedExperiment)
    }
  }, [selectedExperiment])

  const fetchExperiments = async () => {
    try {
      // In a real implementation, you'd have an API endpoint to list all experiments
      // For now, we'll use a hardcoded list
      setExperiments([
        { name: 'landing_page_hero', displayName: 'Landing Page Hero', status: 'running' }
      ])
      setSelectedExperiment('landing_page_hero')
    } catch (err) {
      setError('Failed to fetch experiments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async (experimentName) => {
    try {
      setLoading(true)
      const response = await api.get(`/experiments/${experimentName}/results`)
      setResults(response.data)
    } catch (err) {
      setError('Failed to fetch experiment results')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartExperiment = async (experimentName) => {
    try {
      await api.post(`/experiments/${experimentName}/start`)
      fetchExperiments()
      alert(`Experiment "${experimentName}" started!`)
    } catch (err) {
      alert('Failed to start experiment')
      console.error(err)
    }
  }

  const handleStopExperiment = async (experimentName) => {
    try {
      await api.post(`/experiments/${experimentName}/stop`)
      fetchExperiments()
      alert(`Experiment "${experimentName}" stopped!`)
    } catch (err) {
      alert('Failed to stop experiment')
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="experiments-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading experiments...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="experiments-dashboard error">
        <p>⚠️ {error}</p>
      </div>
    )
  }

  return (
    <div className="experiments-dashboard">
      <div className="dashboard-header">
        <h2>A/B Testing Dashboard</h2>
        <p className="subtitle">Track experiment performance and optimize conversion rates</p>
      </div>

      <div className="experiment-selector">
        <label>Select Experiment:</label>
        <select
          value={selectedExperiment || ''}
          onChange={(e) => setSelectedExperiment(e.target.value)}
        >
          {experiments.map((exp) => (
            <option key={exp.name} value={exp.name}>
              {exp.displayName} ({exp.status})
            </option>
          ))}
        </select>
      </div>

      {results && (
        <div className="experiment-results">
          <div className="experiment-info">
            <h3>{results.experimentName}</h3>
            <span className={`status-badge ${results.status}`}>{results.status}</span>
          </div>

          {/* Control Variant */}
          <div className="control-section">
            <h4>Control (Baseline)</h4>
            <div className="variant-card control">
              <div className="variant-header">
                <span className="variant-name">{results.control.variant}</span>
              </div>
              <div className="variant-stats">
                <div className="stat">
                  <div className="stat-label">Assignments</div>
                  <div className="stat-value">{results.control.assignments}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Conversions</div>
                  <div className="stat-value">{results.control.conversions}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Conversion Rate</div>
                  <div className="stat-value">{results.control.conversionRate}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Treatment Variants */}
          <div className="treatments-section">
            <h4>Variants</h4>
            <div className="variants-grid">
              {results.treatments.map((treatment) => (
                <div key={treatment.variant} className="variant-card">
                  <div className="variant-header">
                    <span className="variant-name">{treatment.variant}</span>
                    {treatment.isSignificant && (
                      <span className="significance-badge">✓ Significant</span>
                    )}
                  </div>
                  <div className="variant-stats">
                    <div className="stat">
                      <div className="stat-label">Assignments</div>
                      <div className="stat-value">{treatment.assignments}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Conversions</div>
                      <div className="stat-value">{treatment.conversions}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Conversion Rate</div>
                      <div className="stat-value">{treatment.conversionRate}%</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Lift vs Control</div>
                      <div className={`stat-value ${parseFloat(treatment.lift) > 0 ? 'positive' : 'negative'}`}>
                        {treatment.lift}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Confidence</div>
                      <div className="stat-value">{treatment.confidence}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">P-Value</div>
                      <div className="stat-value">{treatment.pValue}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interpretation Guide */}
          <div className="interpretation-guide">
            <h4>📊 How to Read These Results</h4>
            <ul>
              <li><strong>Conversion Rate:</strong> Percentage of users who completed the desired action</li>
              <li><strong>Lift:</strong> Performance improvement vs. control (positive = better, negative = worse)</li>
              <li><strong>P-Value:</strong> Statistical significance (lower is better, &lt;0.05 = significant)</li>
              <li><strong>Confidence:</strong> Level of certainty in the results (95%+ is statistically significant)</li>
            </ul>
            <p className="note">
              <strong>Note:</strong> Wait for statistical significance before making decisions.
              Typically requires 100+ conversions per variant.
            </p>
          </div>

          {/* Actions */}
          <div className="experiment-actions">
            {results.status === 'running' ? (
              <button
                className="btn btn-danger"
                onClick={() => handleStopExperiment(results.experimentName)}
              >
                Stop Experiment
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleStartExperiment(results.experimentName)}
              >
                Start Experiment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ExperimentsDashboard
