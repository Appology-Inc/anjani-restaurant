import { describe, it, expect } from 'vitest'
import { setupCounter } from './counter'

describe('setupCounter', () => {
  it('initializes and increments the counter on click', () => {
    const button = document.createElement('button')
    setupCounter(button)
    
    expect(button.innerHTML).toBe('Count is 0')
    
    button.click()
    expect(button.innerHTML).toBe('Count is 1')
    
    button.click()
    expect(button.innerHTML).toBe('Count is 2')
  })
})
