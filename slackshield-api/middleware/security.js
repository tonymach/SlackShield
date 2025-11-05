/**
 * Security Middleware
 * Implements various security controls for enterprise readiness
 */

import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { v4 as uuidv4 } from 'uuid'
import { logSecurityError } from '../utils/auditLog.js'

/**
 * Security Headers (helmet.js)
 * Protects against XSS, clickjacking, MIME sniffing, etc.
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for development
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
}

/**
 * Rate Limiting
 * Prevents brute force attacks and DDoS
 */

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logSecurityError({
      action: 'RATE_LIMIT_EXCEEDED',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      userId: req.user?.id
    })

    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: req.rateLimit.resetTime
    })
  }
})

// Strict rate limit for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityError({
      action: 'AUTH_RATE_LIMIT_EXCEEDED',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    })

    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please try again in 15 minutes',
      retryAfter: req.rateLimit.resetTime
    })
  }
})

// Stricter limit for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: 'Too many requests for this sensitive operation',
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Request ID Middleware
 * Adds unique ID to each request for tracing and debugging
 */
export function requestId(req, res, next) {
  req.id = uuidv4()
  res.setHeader('X-Request-ID', req.id)
  next()
}

/**
 * HTTPS Enforcement
 * Redirects HTTP to HTTPS in production
 */
export function enforceHTTPS(req, res, next) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next()
  }

  // Check if request is already HTTPS
  const isSecure = req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.connection.encrypted

  if (!isSecure) {
    logSecurityError({
      action: 'HTTP_REQUEST_REJECTED',
      ip: req.ip,
      path: req.path,
      error: 'HTTPS required'
    })

    return res.status(426).json({
      error: 'Upgrade Required',
      message: 'Please use HTTPS'
    })
  }

  next()
}

/**
 * Sanitize Error Response
 * Prevents information leakage in error messages
 */
export function sanitizeError(err, req, res, next) {
  // Log full error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    requestId: req.id,
    userId: req.user?.id,
    path: req.path
  })

  // Log security error
  logSecurityError({
    action: 'ERROR',
    error: err.message,
    path: req.path,
    userId: req.user?.id,
    requestId: req.id
  })

  // Determine status code
  const statusCode = err.statusCode || err.status || 500

  // Don't leak internal details in production
  const isDevelopment = process.env.NODE_ENV === 'development'

  const errorResponse = {
    error: statusCode >= 500 ? 'Internal server error' : err.message,
    requestId: req.id,
    ...(isDevelopment && {
      stack: err.stack,
      details: err.details
    })
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * CORS Configuration with Whitelist
 * Only allow specific origins in production
 */
export function corsOptions() {
  const whitelist = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'] // Default for development

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true)
      }

      // In development, allow all origins
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true)
      }

      // In production, check whitelist
      if (whitelist.includes(origin)) {
        callback(null, true)
      } else {
        logSecurityError({
          action: 'CORS_BLOCKED',
          error: `Origin ${origin} not allowed`,
          metadata: { origin }
        })
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  }
}

/**
 * Security Headers for API Responses
 */
export function secureResponseHeaders(req, res, next) {
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  // Content type security
  res.setHeader('X-Content-Type-Options', 'nosniff')

  next()
}

/**
 * Input Size Limits
 * Prevent DoS attacks via large payloads
 */
export const bodyParserLimits = {
  json: { limit: '100kb' },
  urlencoded: { limit: '100kb', extended: true }
}

export default {
  securityHeaders,
  apiLimiter,
  authLimiter,
  strictLimiter,
  requestId,
  enforceHTTPS,
  sanitizeError,
  corsOptions,
  secureResponseHeaders,
  bodyParserLimits
}
