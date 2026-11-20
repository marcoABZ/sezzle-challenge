import { useEffect, useRef, useState } from 'react'
import type { Key } from '../hooks/calculatorState.ts'
import { useCalculator } from '../hooks/useCalculator.ts'
import { Display } from './Display.tsx'
import { KeyboardLegend } from './KeyboardLegend.tsx'
import { Keypad } from './Keypad.tsx'
import { keyForKeyboard } from './keys.ts'
import './Calculator.css'

const FLASH_MS = 160

export function Calculator() {
  const { expression, result, error, busy, press } = useCalculator()
  const [flashed, setFlashed] = useState<Key | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = keyForKeyboard(event)
      if (key === undefined) return
      // Enter would also click the focused button, and "/" opens quick find
      // in Firefox.
      event.preventDefault()
      press(key)
      setFlashed(key)
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlashed(null), FLASH_MS)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [press])

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  return (
    <main className="stage">
      <div className="calculator">
        <Display expression={expression} result={result} error={error} busy={busy} />
        <Keypad onPress={press} flashed={flashed} />
      </div>
      <KeyboardLegend />
    </main>
  )
}
