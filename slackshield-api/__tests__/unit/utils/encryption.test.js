import { describe, test, expect } from '@jest/globals'
import { encrypt, decrypt } from '../../../utils/encryption.js'

describe('Encryption Utils', () => {
  describe('encrypt()', () => {
    test('encrypts text successfully', () => {
      const original = 'xoxp-slack-token-123456'
      const encrypted = encrypt(original)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(original)
      expect(typeof encrypted).toBe('string')
    })

    test('encrypted text contains IV separator', () => {
      const original = 'test-token'
      const encrypted = encrypt(original)

      expect(encrypted).toContain(':')
      const parts = encrypted.split(':')
      expect(parts).toHaveLength(2) // IV:encrypted_data
    })

    test('produces different ciphertext each time (different IVs)', () => {
      const text = 'same-text'
      const encrypted1 = encrypt(text)
      const encrypted2 = encrypt(text)

      expect(encrypted1).not.toBe(encrypted2) // Different IVs make different output
    })

    test('handles empty string', () => {
      const encrypted = encrypt('')
      expect(encrypted).toBeDefined()
      expect(encrypted).toContain(':')
    })

    test('handles long strings', () => {
      const longString = 'x'.repeat(1000)
      const encrypted = encrypt(longString)

      expect(encrypted).toBeDefined()
      expect(encrypted.length).toBeGreaterThan(longString.length)
    })

    test('handles special characters', () => {
      const special = '!@#$%^&*()_+-=[]{}|;:",.<>?/`~'
      const encrypted = encrypt(special)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(special)
    })

    test('handles unicode and emoji', () => {
      const emoji = '🛡️ SlackShield 日本語 中文'
      const encrypted = encrypt(emoji)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(emoji)
    })
  })

  describe('decrypt()', () => {
    test('decrypts encrypted text correctly', () => {
      const original = 'xoxp-slack-token-123456'
      const encrypted = encrypt(original)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(original)
    })

    test('round-trip encryption/decryption preserves data', () => {
      const testCases = [
        'simple',
        'with spaces and punctuation!',
        '!@#$%^&*()_+-=[]{}|;:",.<>?/`~',
        '🛡️ emoji test',
        'x'.repeat(1000), // Long string
        '', // Empty string
        'line1\nline2\nline3' // Newlines
      ]

      testCases.forEach(original => {
        const encrypted = encrypt(original)
        const decrypted = decrypt(encrypted)
        expect(decrypted).toBe(original)
      })
    })

    test('throws error on invalid encrypted format', () => {
      expect(() => decrypt('invalid')).toThrow()
      expect(() => decrypt('no-colon-separator')).toThrow()
      expect(() => decrypt('invalid:format')).toThrow()
    })

    test('throws error on empty input', () => {
      expect(() => decrypt('')).toThrow()
    })

    test('throws error on malformed IV', () => {
      expect(() => decrypt('not-hex:encrypted-data')).toThrow()
    })
  })

  describe('Security properties', () => {
    test('same plaintext produces different ciphertext (IVs)', () => {
      const plaintext = 'test-token'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)
      const encrypted3 = encrypt(plaintext)

      // All should decrypt to same value
      expect(decrypt(encrypted1)).toBe(plaintext)
      expect(decrypt(encrypted2)).toBe(plaintext)
      expect(decrypt(encrypted3)).toBe(plaintext)

      // But ciphertexts should be different
      expect(encrypted1).not.toBe(encrypted2)
      expect(encrypted2).not.toBe(encrypted3)
      expect(encrypted1).not.toBe(encrypted3)
    })

    test('IV is sufficiently random', () => {
      const ivs = new Set()

      // Generate 100 encryptions
      for (let i = 0; i < 100; i++) {
        const encrypted = encrypt('test')
        const iv = encrypted.split(':')[0]
        ivs.add(iv)
      }

      // All IVs should be unique
      expect(ivs.size).toBe(100)
    })
  })
})
