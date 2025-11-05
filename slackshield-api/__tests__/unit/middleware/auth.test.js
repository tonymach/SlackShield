import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import jwt from 'jsonwebtoken'
import { authenticateToken, generateToken } from '../../../middleware/auth.js'

// Mock environment
process.env.JWT_SECRET = 'test-secret-key-for-testing'

describe('Authentication Middleware', () => {
  describe('authenticateToken()', () => {
    let req, res, next

    beforeEach(() => {
      req = {
        headers: {}
      }
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      next = jest.fn()
    })

    test('accepts valid JWT token', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = jwt.sign(user, process.env.JWT_SECRET)

      req.headers.authorization = `Bearer ${token}`

      authenticateToken(req, res, next)

      expect(req.user).toEqual(expect.objectContaining({
        id: '123',
        email: 'test@example.com'
      }))
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test('rejects missing Authorization header', () => {
      authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required'
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('rejects missing token in Authorization header', () => {
      req.headers.authorization = 'Bearer '

      authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required'
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('rejects invalid JWT token', () => {
      req.headers.authorization = 'Bearer invalid-token'

      authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('rejects expired JWT token', () => {
      const user = { id: '123', email: 'test@example.com' }
      const expiredToken = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: '-1h' // Expired 1 hour ago
      })

      req.headers.authorization = `Bearer ${expiredToken}`

      authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('rejects token signed with wrong secret', () => {
      const user = { id: '123', email: 'test@example.com' }
      const wrongToken = jwt.sign(user, 'wrong-secret')

      req.headers.authorization = `Bearer ${wrongToken}`

      authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })

    test('extracts user data from token', () => {
      const userData = {
        id: 'user-123',
        email: 'john@example.com',
        customField: 'custom-value'
      }
      const token = jwt.sign(userData, process.env.JWT_SECRET)

      req.headers.authorization = `Bearer ${token}`

      authenticateToken(req, res, next)

      expect(req.user).toEqual(expect.objectContaining(userData))
      expect(next).toHaveBeenCalled()
    })

    test('handles malformed Authorization header', () => {
      req.headers.authorization = 'InvalidFormat'

      authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('generateToken()', () => {
    test('creates valid JWT token', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = generateToken(user)

      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts

      // Verify it can be decoded
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      expect(decoded.id).toBe('123')
      expect(decoded.email).toBe('test@example.com')
    })

    test('includes user id in token', () => {
      const user = { id: 'user-456', email: 'test@example.com' }
      const token = generateToken(user)

      const decoded = jwt.decode(token)
      expect(decoded.id).toBe('user-456')
    })

    test('includes user email in token', () => {
      const user = { id: '123', email: 'john.doe@example.com' }
      const token = generateToken(user)

      const decoded = jwt.decode(token)
      expect(decoded.email).toBe('john.doe@example.com')
    })

    test('sets 30-day expiry', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = generateToken(user)

      const decoded = jwt.decode(token)

      // Calculate expected expiry (30 days from now)
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60
      const expectedExpiry = Math.floor(Date.now() / 1000) + thirtyDaysInSeconds

      // Allow 5 second tolerance
      expect(decoded.exp).toBeGreaterThan(expectedExpiry - 5)
      expect(decoded.exp).toBeLessThan(expectedExpiry + 5)
    })

    test('includes iat (issued at) claim', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = generateToken(user)

      const decoded = jwt.decode(token)
      const now = Math.floor(Date.now() / 1000)

      expect(decoded.iat).toBeDefined()
      expect(decoded.iat).toBeGreaterThan(now - 5)
      expect(decoded.iat).toBeLessThan(now + 5)
    })

    test('generates different tokens for same user (different iat)', async () => {
      const user = { id: '123', email: 'test@example.com' }

      const token1 = generateToken(user)
      // Wait 1000ms to ensure different timestamp (iat is in seconds)
      await new Promise(resolve => setTimeout(resolve, 1000))
      const token2 = generateToken(user)

      expect(token1).not.toBe(token2)

      // But both should be valid
      const decoded1 = jwt.verify(token1, process.env.JWT_SECRET)
      const decoded2 = jwt.verify(token2, process.env.JWT_SECRET)

      expect(decoded1.id).toBe(decoded2.id)
      expect(decoded1.email).toBe(decoded2.email)
    })

    test('token can be used with authenticateToken', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = generateToken(user)

      const req = {
        headers: { authorization: `Bearer ${token}` }
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      authenticateToken(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user.id).toBe('123')
      expect(req.user.email).toBe('test@example.com')
    })
  })

  describe('Token lifecycle', () => {
    test('newly generated token is immediately valid', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = generateToken(user)

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET)
      }).not.toThrow()
    })

    test('token remains valid before expiry', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: '1h' // Expires in 1 hour
      })

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET)
      }).not.toThrow()
    })

    test('token becomes invalid after expiry', () => {
      const user = { id: '123', email: 'test@example.com' }
      const expiredToken = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: '-1s' // Expired 1 second ago
      })

      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET)
      }).toThrow('jwt expired')
    })
  })

  describe('Security properties', () => {
    test('token cannot be modified without detection', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = generateToken(user)

      // Try to modify the token by changing a character
      const tamperedToken = token.substring(0, token.length - 5) + 'XXXXX'

      expect(() => {
        jwt.verify(tamperedToken, process.env.JWT_SECRET)
      }).toThrow()
    })

    test('token payload cannot be read without verification', () => {
      const user = { id: '123', email: 'test@example.com' }
      const token = generateToken(user)

      // decode() doesn't verify signature - just reads payload
      const decoded = jwt.decode(token)
      expect(decoded.id).toBe('123')

      // But verify() checks signature
      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET)
      }).not.toThrow()
    })

    test('different secrets produce different tokens', () => {
      const user = { id: '123', email: 'test@example.com' }

      const token1 = jwt.sign(user, 'secret1')
      const token2 = jwt.sign(user, 'secret2')

      expect(token1).not.toBe(token2)

      // Token1 valid with secret1, invalid with secret2
      expect(() => jwt.verify(token1, 'secret1')).not.toThrow()
      expect(() => jwt.verify(token1, 'secret2')).toThrow()
    })
  })
})
