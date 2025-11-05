import { describe, test, expect } from '@jest/globals'
import { isWithinOffHours } from '../../../services/dndScheduler.js'

describe('DND Scheduler - Time Logic', () => {
  describe('isWithinOffHours() - Same-day schedule', () => {
    const schedule = {
      day_of_week: 1, // Monday
      start_time: '09:00',
      end_time: '17:00',
      timezone: 'America/Toronto'
    }

    test('returns true when within hours', () => {
      expect(isWithinOffHours('09:00', 1, schedule)).toBe(true) // Start boundary
      expect(isWithinOffHours('12:00', 1, schedule)).toBe(true) // Middle
      expect(isWithinOffHours('16:59', 1, schedule)).toBe(true) // End boundary (inclusive)
    })

    test('returns false when outside hours', () => {
      expect(isWithinOffHours('08:59', 1, schedule)).toBe(false) // Just before start
      expect(isWithinOffHours('17:00', 1, schedule)).toBe(false) // At end (exclusive)
      expect(isWithinOffHours('17:01', 1, schedule)).toBe(false) // After end
      expect(isWithinOffHours('23:59', 1, schedule)).toBe(false) // Late night
      expect(isWithinOffHours('00:00', 1, schedule)).toBe(false) // Midnight
    })

    test('returns false for wrong day of week', () => {
      expect(isWithinOffHours('12:00', 0, schedule)).toBe(false) // Sunday
      expect(isWithinOffHours('12:00', 2, schedule)).toBe(false) // Tuesday
      expect(isWithinOffHours('12:00', 6, schedule)).toBe(false) // Saturday
    })

    test('handles edge case: same start and end time', () => {
      const sameTimeSchedule = {
        day_of_week: 1,
        start_time: '12:00',
        end_time: '12:00'
      }

      // Same start and end means zero duration - should be false
      expect(isWithinOffHours('12:00', 1, sameTimeSchedule)).toBe(false)
      expect(isWithinOffHours('11:59', 1, sameTimeSchedule)).toBe(false)
      expect(isWithinOffHours('12:01', 1, sameTimeSchedule)).toBe(false)
    })
  })

  describe('isWithinOffHours() - Overnight schedule', () => {
    const schedule = {
      day_of_week: 1, // Monday evening to Tuesday morning
      start_time: '18:00', // 6 PM
      end_time: '08:00', // 8 AM next day
      timezone: 'America/Toronto'
    }

    test('returns true after start time (evening)', () => {
      expect(isWithinOffHours('18:00', 1, schedule)).toBe(true) // Start boundary
      expect(isWithinOffHours('18:01', 1, schedule)).toBe(true)
      expect(isWithinOffHours('20:00', 1, schedule)).toBe(true) // Evening
      expect(isWithinOffHours('23:59', 1, schedule)).toBe(true) // Late night
    })

    test('returns true before end time (early morning)', () => {
      expect(isWithinOffHours('00:00', 1, schedule)).toBe(true) // Midnight
      expect(isWithinOffHours('06:00', 1, schedule)).toBe(true) // Early morning
      expect(isWithinOffHours('07:59', 1, schedule)).toBe(true) // End boundary (inclusive)
    })

    test('returns false during day hours', () => {
      expect(isWithinOffHours('08:00', 1, schedule)).toBe(false) // At end (exclusive)
      expect(isWithinOffHours('09:00', 1, schedule)).toBe(false)
      expect(isWithinOffHours('12:00', 1, schedule)).toBe(false) // Noon
      expect(isWithinOffHours('17:00', 1, schedule)).toBe(false)
      expect(isWithinOffHours('17:59', 1, schedule)).toBe(false) // Just before start
    })

    test('returns false for wrong day', () => {
      expect(isWithinOffHours('20:00', 0, schedule)).toBe(false) // Sunday
      expect(isWithinOffHours('02:00', 2, schedule)).toBe(false) // Tuesday
    })
  })

  describe('isWithinOffHours() - Edge cases', () => {
    test('handles midnight crossing correctly', () => {
      const midnightSchedule = {
        day_of_week: 5, // Friday
        start_time: '23:00',
        end_time: '01:00'
      }

      expect(isWithinOffHours('23:00', 5, midnightSchedule)).toBe(true)
      expect(isWithinOffHours('23:30', 5, midnightSchedule)).toBe(true)
      expect(isWithinOffHours('00:00', 5, midnightSchedule)).toBe(true) // Past midnight
      expect(isWithinOffHours('00:30', 5, midnightSchedule)).toBe(true)
      expect(isWithinOffHours('00:59', 5, midnightSchedule)).toBe(true)
      expect(isWithinOffHours('01:00', 5, midnightSchedule)).toBe(false) // At end
      expect(isWithinOffHours('22:59', 5, midnightSchedule)).toBe(false) // Before start
    })

    test('handles full 24-hour coverage (overnight)', () => {
      const fullDaySchedule = {
        day_of_week: 1,
        start_time: '00:00',
        end_time: '23:59'
      }

      expect(isWithinOffHours('00:00', 1, fullDaySchedule)).toBe(true)
      expect(isWithinOffHours('12:00', 1, fullDaySchedule)).toBe(true)
      expect(isWithinOffHours('23:58', 1, fullDaySchedule)).toBe(true)
      expect(isWithinOffHours('23:59', 1, fullDaySchedule)).toBe(false) // Exclusive end
    })

    test('handles minute-precision boundaries', () => {
      const schedule = {
        day_of_week: 3, // Wednesday
        start_time: '14:30',
        end_time: '14:45'
      }

      expect(isWithinOffHours('14:29', 3, schedule)).toBe(false)
      expect(isWithinOffHours('14:30', 3, schedule)).toBe(true)
      expect(isWithinOffHours('14:37', 3, schedule)).toBe(true)
      expect(isWithinOffHours('14:44', 3, schedule)).toBe(true)
      expect(isWithinOffHours('14:45', 3, schedule)).toBe(false)
      expect(isWithinOffHours('14:46', 3, schedule)).toBe(false)
    })

    test('handles early morning hours (01:00 - 05:00)', () => {
      const earlyMorningSchedule = {
        day_of_week: 2, // Tuesday
        start_time: '01:00',
        end_time: '05:00'
      }

      expect(isWithinOffHours('00:59', 2, earlyMorningSchedule)).toBe(false)
      expect(isWithinOffHours('01:00', 2, earlyMorningSchedule)).toBe(true)
      expect(isWithinOffHours('03:00', 2, earlyMorningSchedule)).toBe(true)
      expect(isWithinOffHours('04:59', 2, earlyMorningSchedule)).toBe(true)
      expect(isWithinOffHours('05:00', 2, earlyMorningSchedule)).toBe(false)
    })
  })

  describe('isWithinOffHours() - Real-world scenarios', () => {
    test('typical weekday evening (6 PM - 8 AM)', () => {
      const schedule = {
        day_of_week: 1, // Monday
        start_time: '18:00',
        end_time: '08:00'
      }

      // Should be off-hours
      expect(isWithinOffHours('18:00', 1, schedule)).toBe(true) // 6 PM
      expect(isWithinOffHours('19:30', 1, schedule)).toBe(true) // 7:30 PM
      expect(isWithinOffHours('22:00', 1, schedule)).toBe(true) // 10 PM
      expect(isWithinOffHours('23:59', 1, schedule)).toBe(true) // Before midnight
      expect(isWithinOffHours('00:00', 1, schedule)).toBe(true) // Midnight
      expect(isWithinOffHours('06:00', 1, schedule)).toBe(true) // 6 AM
      expect(isWithinOffHours('07:59', 1, schedule)).toBe(true) // 7:59 AM

      // Should be work hours
      expect(isWithinOffHours('08:00', 1, schedule)).toBe(false) // 8 AM
      expect(isWithinOffHours('09:00', 1, schedule)).toBe(false) // 9 AM
      expect(isWithinOffHours('12:00', 1, schedule)).toBe(false) // Noon
      expect(isWithinOffHours('17:00', 1, schedule)).toBe(false) // 5 PM
      expect(isWithinOffHours('17:59', 1, schedule)).toBe(false) // 5:59 PM
    })

    test('weekend all-day protection (00:00 - 23:59)', () => {
      const weekendSchedule = {
        day_of_week: 0, // Sunday
        start_time: '00:00',
        end_time: '23:59'
      }

      expect(isWithinOffHours('00:00', 0, weekendSchedule)).toBe(true)
      expect(isWithinOffHours('08:00', 0, weekendSchedule)).toBe(true)
      expect(isWithinOffHours('12:00', 0, weekendSchedule)).toBe(true)
      expect(isWithinOffHours('18:00', 0, weekendSchedule)).toBe(true)
      expect(isWithinOffHours('23:58', 0, weekendSchedule)).toBe(true)

      // Wrong day
      expect(isWithinOffHours('12:00', 1, weekendSchedule)).toBe(false)
    })

    test('lunch break (12:00 - 13:00)', () => {
      const lunchSchedule = {
        day_of_week: 3, // Wednesday
        start_time: '12:00',
        end_time: '13:00'
      }

      expect(isWithinOffHours('11:59', 3, lunchSchedule)).toBe(false)
      expect(isWithinOffHours('12:00', 3, lunchSchedule)).toBe(true)
      expect(isWithinOffHours('12:30', 3, lunchSchedule)).toBe(true)
      expect(isWithinOffHours('12:59', 3, lunchSchedule)).toBe(true)
      expect(isWithinOffHours('13:00', 3, lunchSchedule)).toBe(false)
    })

    test('late night shift (22:00 - 06:00)', () => {
      const nightShiftSchedule = {
        day_of_week: 4, // Thursday night to Friday morning
        start_time: '22:00',
        end_time: '06:00'
      }

      expect(isWithinOffHours('21:59', 4, nightShiftSchedule)).toBe(false)
      expect(isWithinOffHours('22:00', 4, nightShiftSchedule)).toBe(true)
      expect(isWithinOffHours('23:00', 4, nightShiftSchedule)).toBe(true)
      expect(isWithinOffHours('02:00', 4, nightShiftSchedule)).toBe(true) // 2 AM
      expect(isWithinOffHours('05:59', 4, nightShiftSchedule)).toBe(true)
      expect(isWithinOffHours('06:00', 4, nightShiftSchedule)).toBe(false)
    })
  })

  describe('isWithinOffHours() - Input validation', () => {
    test('handles all days of week (0-6)', () => {
      const schedules = [
        { day_of_week: 0, start_time: '10:00', end_time: '12:00' }, // Sunday
        { day_of_week: 1, start_time: '10:00', end_time: '12:00' }, // Monday
        { day_of_week: 2, start_time: '10:00', end_time: '12:00' }, // Tuesday
        { day_of_week: 3, start_time: '10:00', end_time: '12:00' }, // Wednesday
        { day_of_week: 4, start_time: '10:00', end_time: '12:00' }, // Thursday
        { day_of_week: 5, start_time: '10:00', end_time: '12:00' }, // Friday
        { day_of_week: 6, start_time: '10:00', end_time: '12:00' }  // Saturday
      ]

      schedules.forEach((schedule, index) => {
        expect(isWithinOffHours('11:00', index, schedule)).toBe(true)
        expect(isWithinOffHours('11:00', (index + 1) % 7, schedule)).toBe(false)
      })
    })

    test('handles various time formats correctly', () => {
      const schedule = {
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00'
      }

      // These should all work
      expect(isWithinOffHours('09:00', 1, schedule)).toBe(true)
      expect(isWithinOffHours('9:00', 1, schedule)).toBe(true) // Single digit hour
      expect(isWithinOffHours('09:05', 1, schedule)).toBe(true)
    })
  })
})
