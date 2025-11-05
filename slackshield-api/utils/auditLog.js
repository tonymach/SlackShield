/**
 * Structured Audit Logging System
 * Logs all security-relevant events for compliance and incident investigation
 */

/**
 * Log an audit event
 * @param {Object} event - Event details
 * @param {string} event.type - Event type (AUTH, ACCESS, CHANGE, ERROR)
 * @param {string} event.action - Specific action (LOGIN, CREATE, UPDATE, DELETE)
 * @param {string} event.userId - User ID performing action
 * @param {string} event.workspaceId - Workspace ID (if applicable)
 * @param {string} event.resourceType - Type of resource (user, workspace, schedule, etc.)
 * @param {string} event.resourceId - ID of resource being accessed
 * @param {boolean} event.success - Whether action succeeded
 * @param {string} event.ip - IP address of requester
 * @param {string} event.userAgent - User agent string
 * @param {string} event.error - Error message (if failed)
 * @param {Object} event.metadata - Additional metadata
 */
export function auditLog(event) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: event.success ? 'info' : 'warn',
    type: event.type || 'UNKNOWN',
    action: event.action || 'UNKNOWN',
    user_id: event.userId || 'anonymous',
    workspace_id: event.workspaceId || null,
    resource_type: event.resourceType || null,
    resource_id: event.resourceId || null,
    success: event.success !== false, // Default to true
    ip_address: event.ip || 'unknown',
    user_agent: event.userAgent || 'unknown',
    request_id: event.requestId || null,
    error: event.error || null,
    metadata: event.metadata || {}
  }

  // In production, this would go to a SIEM (Splunk, DataDog, CloudWatch)
  // For now, structured JSON to stdout (Docker/K8s can collect it)
  console.log(JSON.stringify(logEntry))

  return logEntry
}

/**
 * Audit logger middleware
 * Adds audit logging helpers to request object
 */
export function auditMiddleware(req, res, next) {
  // Add audit log helper to request
  req.auditLog = (event) => {
    return auditLog({
      ...event,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
      userId: req.user?.id
    })
  }

  next()
}

/**
 * Log authentication events
 */
export function logAuth(event) {
  return auditLog({
    type: 'AUTH',
    ...event
  })
}

/**
 * Log data access events
 */
export function logAccess(event) {
  return auditLog({
    type: 'ACCESS',
    ...event
  })
}

/**
 * Log data modification events
 */
export function logChange(event) {
  return auditLog({
    type: 'CHANGE',
    ...event
  })
}

/**
 * Log security errors
 */
export function logSecurityError(event) {
  return auditLog({
    type: 'SECURITY_ERROR',
    success: false,
    ...event
  })
}

export default {
  auditLog,
  auditMiddleware,
  logAuth,
  logAccess,
  logChange,
  logSecurityError
}
