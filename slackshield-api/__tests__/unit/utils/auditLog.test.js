import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { auditLog, logAuth, logAccess, logChange, logSecurityError, auditMiddleware } from '../../../utils/auditLog.js'

describe('Audit Logging', () => {
  let consoleLogSpy

  beforeEach(() => {
    // Spy on console.log to capture audit logs
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('auditLog()', () => {
    test('logs structured JSON to console', () => {
      const event = {
        type: 'TEST',
        action: 'CREATE',
        userId: 'user-123',
        success: true
      }

      auditLog(event)

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData).toMatchObject({
        type: 'TEST',
        action: 'CREATE',
        user_id: 'user-123',
        success: true
      })
    })

    test('includes timestamp in ISO format', () => {
      auditLog({ type: 'TEST' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.timestamp).toBeDefined()
      expect(new Date(loggedData.timestamp)).toBeInstanceOf(Date)
    })

    test('defaults success to true', () => {
      auditLog({ type: 'TEST' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.success).toBe(true)
    })

    test('sets success to false when explicitly provided', () => {
      auditLog({ type: 'TEST', success: false })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.success).toBe(false)
    })

    test('includes IP address and user agent', () => {
      auditLog({
        type: 'TEST',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.ip_address).toBe('192.168.1.1')
      expect(loggedData.user_agent).toBe('Mozilla/5.0')
    })

    test('includes error message for failed events', () => {
      auditLog({
        type: 'ERROR',
        success: false,
        error: 'Something went wrong'
      })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.error).toBe('Something went wrong')
      expect(loggedData.success).toBe(false)
    })

    test('includes metadata', () => {
      auditLog({
        type: 'TEST',
        metadata: {
          custom: 'data',
          foo: 'bar'
        }
      })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.metadata).toEqual({
        custom: 'data',
        foo: 'bar'
      })
    })

    test('handles missing optional fields', () => {
      auditLog({ type: 'TEST' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.user_id).toBe('anonymous')
      expect(loggedData.workspace_id).toBeNull()
      expect(loggedData.resource_type).toBeNull()
      expect(loggedData.ip_address).toBe('unknown')
    })
  })

  describe('logAuth()', () => {
    test('automatically sets type to AUTH', () => {
      logAuth({ action: 'LOGIN', userId: 'user-123' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.type).toBe('AUTH')
      expect(loggedData.action).toBe('LOGIN')
    })
  })

  describe('logAccess()', () => {
    test('automatically sets type to ACCESS', () => {
      logAccess({ action: 'READ', resourceType: 'schedule', resourceId: 'sch-123' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.type).toBe('ACCESS')
      expect(loggedData.resource_type).toBe('schedule')
    })
  })

  describe('logChange()', () => {
    test('automatically sets type to CHANGE', () => {
      logChange({ action: 'UPDATE', resourceType: 'workspace', resourceId: 'ws-123' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.type).toBe('CHANGE')
    })
  })

  describe('logSecurityError()', () => {
    test('automatically sets type to SECURITY_ERROR and success to false', () => {
      logSecurityError({ action: 'INVALID_TOKEN', error: 'Token expired' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.type).toBe('SECURITY_ERROR')
      expect(loggedData.success).toBe(false)
      expect(loggedData.error).toBe('Token expired')
    })
  })

  describe('auditMiddleware()', () => {
    test('adds auditLog helper to request object', () => {
      const req = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Agent' },
        id: 'req-123',
        user: { id: 'user-456' }
      }
      const res = {}
      const next = jest.fn()

      auditMiddleware(req, res, next)

      expect(req.auditLog).toBeDefined()
      expect(typeof req.auditLog).toBe('function')
      expect(next).toHaveBeenCalled()
    })

    test('auditLog helper includes request context', () => {
      const req = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Agent' },
        id: 'req-123',
        user: { id: 'user-456' }
      }
      const res = {}
      const next = jest.fn()

      auditMiddleware(req, res, next)

      req.auditLog({ type: 'TEST', action: 'CREATE' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.ip_address).toBe('192.168.1.1')
      expect(loggedData.user_agent).toBe('Test Agent')
      expect(loggedData.request_id).toBe('req-123')
      expect(loggedData.user_id).toBe('user-456')
    })
  })

  describe('Log format compliance', () => {
    test('all logs are valid JSON', () => {
      auditLog({ type: 'TEST', action: 'CREATE' })
      logAuth({ action: 'LOGIN' })
      logAccess({ action: 'READ' })
      logChange({ action: 'UPDATE' })
      logSecurityError({ action: 'ERROR' })

      consoleLogSpy.mock.calls.forEach(call => {
        expect(() => JSON.parse(call[0])).not.toThrow()
      })
    })

    test('logs include required fields', () => {
      auditLog({ type: 'TEST' })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData).toHaveProperty('timestamp')
      expect(loggedData).toHaveProperty('level')
      expect(loggedData).toHaveProperty('type')
      expect(loggedData).toHaveProperty('action')
      expect(loggedData).toHaveProperty('success')
      expect(loggedData).toHaveProperty('user_id')
    })

    test('log level is info for successful events', () => {
      auditLog({ type: 'TEST', success: true })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.level).toBe('info')
    })

    test('log level is warn for failed events', () => {
      auditLog({ type: 'TEST', success: false })

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])

      expect(loggedData.level).toBe('warn')
    })
  })
})
