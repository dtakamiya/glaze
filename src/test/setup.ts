import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom には scrollTo の実装が無い
window.scrollTo = vi.fn()

afterEach(() => {
  cleanup()
  localStorage.clear()
})
