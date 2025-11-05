/**
 * Input Validation Middleware
 * Uses express-validator to prevent injection attacks and validate input
 */

import { body, param, query, validationResult } from 'express-validator'

/**
 * Handle validation errors
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    })
  }

  next()
}

/**
 * Common validation rules
 */

// UUID validation
export const validateUUID = (field) => [
  param(field)
    .isUUID(4)
    .withMessage(`${field} must be a valid UUID`)
]

// Email validation
export const validateEmail = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address')
]

// Schedule validation
export const validateSchedule = () => [
  body('day_of_week')
    .isInt({ min: 0, max: 6 })
    .withMessage('day_of_week must be 0-6 (Sunday-Saturday)'),

  body('start_time')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('start_time must be in HH:MM format (24-hour)'),

  body('end_time')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('end_time must be in HH:MM format (24-hour)'),

  body('timezone')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('timezone must be a valid timezone string'),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
]

// Template validation
export const validateTemplate = () => [
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('message must be 1-2000 characters'),

  body('is_default')
    .optional()
    .isBoolean()
    .withMessage('is_default must be a boolean')
]

// Pagination validation
export const validatePagination = () => [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('limit must be 1-1000'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be >= 0')
]

// Sanitize string input
export const sanitizeString = (field) => [
  body(field)
    .trim()
    .escape()
]

/**
 * Validation middleware factory
 * Combines validation rules with error handling
 */
export function validate(validations) {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)))

    // Check for errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      })
    }

    next()
  }
}

export default {
  handleValidationErrors,
  validateUUID,
  validateEmail,
  validateSchedule,
  validateTemplate,
  validatePagination,
  sanitizeString,
  validate
}
