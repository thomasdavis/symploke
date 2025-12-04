import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles tailwind conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })
})
