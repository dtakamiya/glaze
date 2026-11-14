import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { OFUSE_SCRIPT_SRC, OfuseButton } from './OfuseButton'

const scripts = () => document.querySelectorAll(`script[src="${OFUSE_SCRIPT_SRC}"]`)

afterEach(() => {
  cleanup()
  scripts().forEach((script) => script.remove())
})

describe('OfuseButton', () => {
  test('renders the OFUSE widget link that opens safely in a new tab', () => {
    render(<OfuseButton />)

    const link = screen.getByRole('link', { name: 'OFUSEで応援を送る' })
    expect(link).toHaveAttribute('href', 'https://ofuse.me/o?uid=234231')
    expect(link).toHaveAttribute('data-ofuse-id', '234231')
    expect(link).toHaveAttribute('data-ofuse-widget-button')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  test('loads the widget script once, even when rendered again', () => {
    const { unmount } = render(<OfuseButton />)
    unmount()
    render(<OfuseButton />)

    expect(scripts()).toHaveLength(1)
    expect(scripts()[0]).toHaveAttribute('async')
  })
})
