import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-for-development-only'

// Ensure key is 32 bytes
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()

/**
 * Encrypt a string
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text with IV prepended
 */
export function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // Prepend IV to encrypted data
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt a string
 * @param {string} encryptedText - Encrypted text with IV prepended
 * @returns {string} Decrypted text
 */
export function decrypt(encryptedText) {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export default { encrypt, decrypt }
