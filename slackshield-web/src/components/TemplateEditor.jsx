import { useState, useEffect } from 'react'
import { templateAPI } from '../services/api'
import './TemplateEditor.css'

const DEFAULT_TEMPLATE = `Hey! I'm currently off the clock and protecting my work-life balance with SlackShield.

I'll respond to your message during my next work hours. If this is truly urgent, please contact [emergency contact method].

Thanks for respecting my boundaries! 🛡️`

export default function TemplateEditor({ workspaceId, templates, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const defaultTemplate = templates.find(t => t.is_default)
    if (defaultTemplate) {
      setMessage(defaultTemplate.message)
    } else {
      setMessage(DEFAULT_TEMPLATE)
    }
  }, [templates])

  const handleSave = async () => {
    setLoading(true)

    try {
      const defaultTemplate = templates.find(t => t.is_default)

      if (defaultTemplate) {
        // Update existing template
        await templateAPI.update(defaultTemplate.id, {
          message,
          is_default: true
        })
      } else {
        // Create new template
        await templateAPI.create(workspaceId, {
          message,
          is_default: true
        })
      }

      setEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to save template:', error)
      alert('Failed to save template. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setMessage(DEFAULT_TEMPLATE)
  }

  return (
    <div className="template-editor">
      {!editing ? (
        <>
          <div className="template-preview">
            <div className="preview-label">Current auto-response:</div>
            <div className="preview-message">
              {message || DEFAULT_TEMPLATE}
            </div>
          </div>
          <button className="btn-outline" onClick={() => setEditing(true)}>
            Edit Message
          </button>
        </>
      ) : (
        <div className="template-form">
          <div className="form-group">
            <label>Auto-Response Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder={DEFAULT_TEMPLATE}
            />
            <div className="template-help">
              <p>💡 Tips for a good auto-response:</p>
              <ul>
                <li>Be clear about your boundaries</li>
                <li>Set expectations for when you'll respond</li>
                <li>Provide an alternative for true emergencies</li>
                <li>Keep it professional but friendly</li>
              </ul>
            </div>
          </div>

          <div className="template-variables">
            <p><strong>Available variables:</strong></p>
            <ul>
              <li><code>{'{{name}}'}</code> - Your name</li>
              <li><code>{'{{workspace}}'}</code> - Workspace name</li>
              <li><code>{'{{next_available}}'}</code> - When you'll be back</li>
            </ul>
          </div>

          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={loading || !message.trim()}
            >
              {loading ? 'Saving...' : 'Save Template'}
            </button>
            <button
              className="btn-outline"
              onClick={handleReset}
              disabled={loading}
            >
              Reset to Default
            </button>
            <button
              className="btn-outline"
              onClick={() => {
                setEditing(false)
                // Revert to saved message
                const defaultTemplate = templates.find(t => t.is_default)
                if (defaultTemplate) {
                  setMessage(defaultTemplate.message)
                }
              }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
