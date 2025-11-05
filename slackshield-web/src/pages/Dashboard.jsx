import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { workspaceAPI, scheduleAPI, violationAPI, templateAPI } from '../services/api'
import ScheduleEditor from '../components/ScheduleEditor'
import ViolationList from '../components/ViolationList'
import TemplateEditor from '../components/TemplateEditor'
import './Dashboard.css'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [violations, setViolations] = useState([])
  const [templates, setTemplates] = useState([])
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('slackshield_token')
    if (!token) {
      navigate('/login')
      return
    }

    fetchData()
  }, [navigate])

  useEffect(() => {
    if (selectedWorkspace) {
      fetchWorkspaceData(selectedWorkspace.id)
    }
  }, [selectedWorkspace])

  const fetchData = async () => {
    try {
      const response = await workspaceAPI.getAll()
      const workspaceData = response.data

      if (workspaceData.length > 0) {
        setWorkspaces(workspaceData)
        setSelectedWorkspace(workspaceData[0])
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch workspaces:', error)
      if (error.response?.status === 401) {
        navigate('/login')
      }
      setLoading(false)
    }
  }

  const fetchWorkspaceData = async (workspaceId) => {
    try {
      const [schedulesRes, violationsRes, templatesRes, statsRes] = await Promise.all([
        scheduleAPI.getAll(workspaceId),
        violationAPI.getAll(workspaceId),
        templateAPI.getAll(workspaceId),
        violationAPI.getStats(workspaceId)
      ])

      setSchedules(schedulesRes.data)
      setViolations(violationsRes.data)
      setTemplates(templatesRes.data)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to fetch workspace data:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('slackshield_token')
    navigate('/login')
  }

  const handleConnectSlack = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/slack`
  }

  if (loading) {
    return <div className="loading">Loading your dashboard...</div>
  }

  if (workspaces.length === 0) {
    return (
      <div className="container">
        <div className="navbar">
          <div className="navbar-content">
            <h1>🛡️ SlackShield</h1>
            <button className="btn-outline" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="empty-state">
          <h3>No Slack workspaces connected</h3>
          <p>Connect your Slack workspace to start protecting your boundaries</p>
          <button className="btn-primary" onClick={handleConnectSlack} style={{ marginTop: '20px' }}>
            Connect Slack Workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="navbar">
        <div className="navbar-content">
          <h1>🛡️ SlackShield</h1>
          <button className="btn-outline" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        {/* Workspace Selector */}
        <div className="card">
          <h2>Connected Workspaces</h2>
          <div className="workspace-list">
            {workspaces.map(workspace => (
              <div
                key={workspace.id}
                className={`workspace-item ${selectedWorkspace?.id === workspace.id ? 'active' : ''}`}
                onClick={() => setSelectedWorkspace(workspace)}
              >
                <div className="workspace-info">
                  <h3>{workspace.team_name}</h3>
                  <span className="status-badge status-active">Connected</span>
                </div>
                <p className="workspace-meta">
                  Connected {new Date(workspace.connected_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
          <button className="btn-outline" onClick={handleConnectSlack} style={{ marginTop: '16px' }}>
            + Add Another Workspace
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card card">
              <div className="stat-value">{stats.total_violations || 0}</div>
              <div className="stat-label">Total Violations</div>
            </div>
            <div className="stat-card card">
              <div className="stat-value">{stats.this_week || 0}</div>
              <div className="stat-label">This Week</div>
            </div>
            <div className="stat-card card">
              <div className="stat-value">{stats.unique_violators || 0}</div>
              <div className="stat-label">Unique Violators</div>
            </div>
            <div className="stat-card card">
              <div className="stat-value">{stats.response_rate || 0}%</div>
              <div className="stat-label">Response Rate</div>
            </div>
          </div>
        )}

        {/* Schedule Editor */}
        <div className="card">
          <h2>Your Schedule</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Set when you're off the clock. SlackShield will enforce DND and auto-respond during these times.
          </p>
          <ScheduleEditor
            workspaceId={selectedWorkspace?.id}
            schedules={schedules}
            onUpdate={() => fetchWorkspaceData(selectedWorkspace.id)}
          />
        </div>

        {/* Auto-Response Template */}
        <div className="card">
          <h2>Auto-Response Message</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            This message will be sent automatically to anyone who messages you during off-hours.
          </p>
          <TemplateEditor
            workspaceId={selectedWorkspace?.id}
            templates={templates}
            onUpdate={() => fetchWorkspaceData(selectedWorkspace.id)}
          />
        </div>

        {/* Violation Log */}
        <div className="card">
          <h2>Violation Log</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Track who's messaging you during off-hours
          </p>
          <ViolationList violations={violations} />
        </div>
      </div>
    </div>
  )
}
