import { describe, it, expect } from 'vitest'
import { userSchema } from './schemas'

describe('userSchema', () => {
  it('validates correct user', () => {
    const result = userSchema.safeParse({
      id: '1',
      name: 'John',
      email: 'john@example.com',
    })
    expect(result.success).toBe(true)
  })
})
