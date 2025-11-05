import { useState } from 'react'
import { scheduleAPI } from '../services/api'
import './ScheduleEditor.css'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

const TIMEZONES = [
  'America/Toronto',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney'
]

export default function ScheduleEditor({ workspaceId, schedules, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '18:00',
    end_time: '08:00',
    timezone: 'America/Toronto',
    is_active: true
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await scheduleAPI.create(workspaceId, formData)
      setEditing(false)
      setFormData({
        day_of_week: 1,
        start_time: '18:00',
        end_time: '08:00',
        timezone: 'America/Toronto',
        is_active: true
      })
      onUpdate()
    } catch (error) {
      console.error('Failed to create schedule:', error)
      alert('Failed to create schedule. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return
    }

    try {
      await scheduleAPI.delete(scheduleId)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      alert('Failed to delete schedule. Please try again.')
    }
  }

  const handleToggle = async (schedule) => {
    try {
      await scheduleAPI.update(schedule.id, {
        ...schedule,
        is_active: !schedule.is_active
      })
      onUpdate()
    } catch (error) {
      console.error('Failed to update schedule:', error)
      alert('Failed to update schedule. Please try again.')
    }
  }

  return (
    <div className="schedule-editor">
      {schedules.length === 0 && !editing ? (
        <div className="empty-state">
          <p>No schedules configured yet</p>
          <button className="btn-primary" onClick={() => setEditing(true)}>
            + Add Schedule
          </button>
        </div>
      ) : (
        <>
          <div className="schedule-list">
            {schedules.map(schedule => (
              <div key={schedule.id} className="schedule-item">
                <div className="schedule-info">
                  <div className="schedule-day">
                    {DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label || 'Unknown'}
                  </div>
                  <div className="schedule-time">
                    {schedule.start_time} - {schedule.end_time}
                  </div>
                  <div className="schedule-timezone">
                    {schedule.timezone}
                  </div>
                  <span className={`status-badge ${schedule.is_active ? 'status-active' : 'status-inactive'}`}>
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="schedule-actions">
                  <button
                    className="btn-outline"
                    onClick={() => handleToggle(schedule)}
                  >
                    {schedule.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(schedule.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!editing && (
            <button
              className="btn-outline"
              onClick={() => setEditing(true)}
              style={{ marginTop: '16px' }}
            >
              + Add Another Schedule
            </button>
          )}
        </>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="schedule-form">
          <h3>Add New Schedule</h3>

          <div className="form-group">
            <label>Day of Week</label>
            <select
              value={formData.day_of_week}
              onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
              required
            >
              {DAYS_OF_WEEK.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time (Off Hours Begin)</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time (Back Online)</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Timezone</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              required
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Schedule'}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setEditing(false)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
