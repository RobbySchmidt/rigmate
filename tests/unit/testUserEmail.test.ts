import { describe, it, expect } from 'vitest'
import { isTestUserEmail } from '../helpers/testUser'

describe('isTestUserEmail', () => {
  it('lehnt null ab', () => {
    expect(isTestUserEmail(null)).toBe(false)
  })

  it('lehnt undefined ab', () => {
    expect(isTestUserEmail(undefined)).toBe(false)
  })

  it('lehnt einen leeren String ab', () => {
    expect(isTestUserEmail('')).toBe(false)
  })

  it('erkennt eine echte Testadresse', () => {
    expect(isTestUserEmail('rigmate-test-abc123@example.invalid')).toBe(true)
  })

  it('lehnt eine Demo-Adresse ab', () => {
    expect(isTestUserEmail('demo-abc123@example.invalid')).toBe(false)
  })

  it('lehnt ab, wenn das Präfix nicht am Anfang steht', () => {
    expect(isTestUserEmail('foo-rigmate-test-abc123@example.invalid')).toBe(false)
  })

  it('ist bewusst case-sensitiv — createTestUser() erzeugt nur Kleinschreibung', () => {
    expect(isTestUserEmail('RIGMATE-TEST-abc123@example.invalid')).toBe(false)
  })
})
