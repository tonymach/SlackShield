import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import {
  requestId,
  enforceHTTPS,
  sanitizeError,
  corsOptions,
  secureResponseHeaders
} from '../../../middleware/security.js'

describe('Security Middleware', () => {
  describe('requestId()', () => {
    test('adds unique ID to request', () => {
      const req = {}
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      requestId(req, res, next)

      expect(req.id).toBeDefined()
      expect(typeof req.id).toBe('string')
      expect(req.id.length).toBeGreaterThan(0)
      expect(next).toHaveBeenCalled()
    })

    test('sets X-Request-ID header', () => {
      const req = {}
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      requestId(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.id)
    })

    test('generates different IDs for different requests', () => {
      const req1 = {}
      const req2 = {}
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      requestId(req1, res, next)
      requestId(req2, res, next)

      expect(req1.id).not.toBe(req2.id)
    })

    test('IDs are valid UUIDs', () => {
      const req = {}
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      requestId(req, res, next)

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(req.id).toMatch(uuidRegex)
    })
  })

  describe('enforceHTTPS()', () => {
    beforeEach(() => {
      // Reset NODE_ENV
      delete process.env.NODE_ENV
    })

    test('allows request in development', () => {
      process.env.NODE_ENV = 'development'

      const req = { secure: false }
      const res = { status: jest.fn(), json: jest.fn() }
      const next = jest.fn()

      enforceHTTPS(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test('allows secure request in production', () => {
      process.env.NODE_ENV = 'production'

      const req = { secure: true }
      const res = { status: jest.fn(), json: jest.fn() }
      const next = jest.fn()

      enforceHTTPS(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test('allows request with x-forwarded-proto header', () => {
      process.env.NODE_ENV = 'production'

      const req = {
        secure: false,
        headers: { 'x-forwarded-proto': 'https' }
      }
      const res = { status: jest.fn(), json: jest.fn() }
      const next = jest.fn()

      enforceHTTPS(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    test('rejects insecure request in production', () => {
      process.env.NODE_ENV = 'production'

      const req = { secure: false, headers: {}, connection: {} }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      enforceHTTPS(req, res, next)

      expect(res.status).toHaveBeenCalledWith(426)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Upgrade Required',
        message: 'Please use HTTPS'
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('sanitizeError()', () => {
    let consoleErrorSpy

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      delete process.env.NODE_ENV
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    test('returns 500 for generic errors', () => {
      const err = new Error('Database connection failed')
      const req = { id: 'req-123', path: '/api/test' }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      sanitizeError(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          requestId: 'req-123'
        })
      )
    })

    test('returns specific status code if provided', () => {
      const err = new Error('Not found')
      err.statusCode = 404

      const req = { id: 'req-123' }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      sanitizeError(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    test('hides internal details in production', () => {
      process.env.NODE_ENV = 'production'

      const err = new Error('Internal error with sensitive data')
      err.stack = 'Error: Stack trace...'

      const req = { id: 'req-123' }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      sanitizeError(err, req, res, next)

      const response = res.json.mock.calls[0][0]
      expect(response.error).toBe('Internal server error')
      expect(response.stack).toBeUndefined()
    })

    test('shows error details in development', () => {
      process.env.NODE_ENV = 'development'

      const err = new Error('Detailed error message')
      err.stack = 'Error: Stack trace...'
      err.statusCode = 400

      const req = { id: 'req-123' }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      sanitizeError(err, req, res, next)

      const response = res.json.mock.calls[0][0]
      expect(response.error).toBe('Detailed error message')
      expect(response.stack).toBeDefined()
    })

    test('includes request ID in response', () => {
      const err = new Error('Test error')
      const req = { id: 'req-abc-123' }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      sanitizeError(err, req, res, next)

      const response = res.json.mock.calls[0][0]
      expect(response.requestId).toBe('req-abc-123')
    })

    test('logs full error for debugging', () => {
      const err = new Error('Test error')
      err.stack = 'Error stack...'

      const req = { id: 'req-123', path: '/api/test', user: { id: 'user-456' } }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      sanitizeError(err, req, res, next)

      expect(consoleErrorSpy).toHaveBeenCalled()
      const loggedError = consoleErrorSpy.mock.calls[0][1]
      expect(loggedError.message).toBe('Test error')
      expect(loggedError.stack).toBeDefined()
      expect(loggedError.requestId).toBe('req-123')
      expect(loggedError.userId).toBe('user-456')
    })
  })

  describe('corsOptions()', () => {
    beforeEach(() => {
      delete process.env.NODE_ENV
      delete process.env.CORS_ORIGINS
    })

    test('allows requests with no origin', (done) => {
      const options = corsOptions()

      options.origin(undefined, (err, allowed) => {
        expect(err).toBeNull()
        expect(allowed).toBe(true)
        done()
      })
    })

    test('allows all origins in development', (done) => {
      process.env.NODE_ENV = 'development'
      const options = corsOptions()

      options.origin('http://evil-site.com', (err, allowed) => {
        expect(err).toBeNull()
        expect(allowed).toBe(true)
        done()
      })
    })

    test('checks whitelist in production', (done) => {
      process.env.NODE_ENV = 'production'
      process.env.CORS_ORIGINS = 'https://app.example.com,https://admin.example.com'

      const options = corsOptions()

      options.origin('https://app.example.com', (err, allowed) => {
        expect(err).toBeNull()
        expect(allowed).toBe(true)
        done()
      })
    })

    test('blocks non-whitelisted origins in production', (done) => {
      process.env.NODE_ENV = 'production'
      process.env.CORS_ORIGINS = 'https://app.example.com'

      const options = corsOptions()

      options.origin('https://evil-site.com', (err, allowed) => {
        expect(err).toBeDefined()
        expect(err.message).toContain('Not allowed by CORS')
        done()
      })
    })

    test('has credentials enabled', () => {
      const options = corsOptions()
      expect(options.credentials).toBe(true)
    })
  })

  describe('secureResponseHeaders()', () => {
    test('sets cache control headers', () => {
      const req = {}
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      secureResponseHeaders(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private'
      )
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache')
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0')
    })

    test('sets X-Content-Type-Options header', () => {
      const req = {}
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      secureResponseHeaders(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
    })

    test('calls next middleware', () => {
      const req = {}
      const res = { setHeader: jest.fn() }
      const next = jest.fn()

      secureResponseHeaders(req, res, next)

      expect(next).toHaveBeenCalled()
    })
  })
})
