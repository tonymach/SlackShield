import { useState } from 'react'
import './ViolationList.css'

export default function ViolationList({ violations }) {
  const [filter, setFilter] = useState('all') // all, today, week, month

  const filterViolations = () => {
    const now = new Date()

    return violations.filter(v => {
      const occurredAt = new Date(v.occurred_at)

      switch (filter) {
        case 'today':
          return occurredAt.toDateString() === now.toDateString()
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return occurredAt >= weekAgo
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return occurredAt >= monthAgo
        default:
          return true
      }
    })
  }

  const groupByViolator = (violations) => {
    const grouped = {}
    violations.forEach(v => {
      if (!grouped[v.violator_slack_id]) {
        grouped[v.violator_slack_id] = {
          name: v.violator_name,
          count: 0,
          violations: []
        }
      }
      grouped[v.violator_slack_id].count++
      grouped[v.violator_slack_id].violations.push(v)
    })
    return Object.values(grouped).sort((a, b) => b.count - a.count)
  }

  const filteredViolations = filterViolations()
  const groupedViolations = groupByViolator(filteredViolations)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  if (violations.length === 0) {
    return (
      <div className="empty-state">
        <p>No violations recorded yet</p>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          When someone messages you during off-hours, it will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="violation-list">
      <div className="violation-filters">
        <button
          className={filter === 'all' ? 'filter-active' : ''}
          onClick={() => setFilter('all')}
        >
          All Time
        </button>
        <button
          className={filter === 'today' ? 'filter-active' : ''}
          onClick={() => setFilter('today')}
        >
          Today
        </button>
        <button
          className={filter === 'week' ? 'filter-active' : ''}
          onClick={() => setFilter('week')}
        >
          This Week
        </button>
        <button
          className={filter === 'month' ? 'filter-active' : ''}
          onClick={() => setFilter('month')}
        >
          This Month
        </button>
      </div>

      <div className="violation-summary">
        <p>
          <strong>{filteredViolations.length}</strong> violations from{' '}
          <strong>{groupedViolations.length}</strong> people
        </p>
      </div>

      <div className="violation-groups">
        {groupedViolations.map((group, idx) => (
          <details key={idx} className="violation-group">
            <summary>
              <div className="violator-info">
                <span className="violator-name">{group.name}</span>
                <span className="violation-count">
                  {group.count} violation{group.count !== 1 ? 's' : ''}
                </span>
              </div>
            </summary>
            <div className="violation-items">
              {group.violations.map((violation, vidx) => (
                <div key={vidx} className="violation-item">
                  <div className="violation-time">
                    {formatDate(violation.occurred_at)}
                  </div>
                  {violation.channel_name && (
                    <div className="violation-channel">
                      in #{violation.channel_name}
                    </div>
                  )}
                  {violation.auto_response_sent && (
                    <span className="status-badge status-active" style={{ fontSize: '11px' }}>
                      Auto-responded
                    </span>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
