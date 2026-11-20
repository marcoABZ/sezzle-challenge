import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Rosette } from './Rosette.tsx'

type DisplayProps = {
  expression: string
  result: string | null
  error: string | null
  busy: boolean
}

type DisplayState = 'typing' | 'pending' | 'issued' | 'error'

const MICROPRINT_GROUPS = Array.from({ length: 24 }, (_, index) => index)

// Public Sans sets "^" small and at mid-height, where it reads as a logic
// sign, so each one gets a span that raises it.
function setCarets(text: string): ReactNode[] {
  return text
    .split('^')
    .flatMap((part, index) => (index === 0 ? [part] : [<span key={index} className="caret">^</span>, part]))
}

// Bodoni's hyphen is a short dash that floats away from the figure, so a
// leading sign gets a span that draws it wider and closer.
function setResult(result: string): ReactNode {
  if (!result.startsWith('-')) return result
  return (
    <>
      <span className="sign">-</span>
      {result.slice(1)}
    </>
  )
}

// Size steps for the large line, by length, so a long figure still fits.
function sizeFor(text: string): 'xl' | 'l' | 'm' | 's' | 'xs' {
  if (text.length <= 5) return 'xl'
  if (text.length <= 8) return 'l'
  if (text.length <= 12) return 'm'
  if (text.length <= 16) return 's'
  return 'xs'
}

// Keeps the end of a line in view: that is where the next key types.
function useScrollToEnd<T extends HTMLElement>(text: string) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [text])
  return ref
}

export function Display({ expression, result, error, busy }: DisplayProps) {
  let state: DisplayState = 'typing'
  if (busy) state = 'pending'
  else if (result !== null) state = 'issued'
  else if (error !== null) state = 'error'

  // After equals the expression moves up and the answer takes the large line.
  const settled = state === 'issued' || state === 'error'
  const above = settled ? expression : ''
  const aboveRef = useScrollToEnd<HTMLParagraphElement>(above)
  const typingRef = useScrollToEnd<HTMLParagraphElement>(expression)

  let announcement = ''
  if (result !== null) announcement = `Equals ${result}`
  else if (error !== null) announcement = error

  return (
    <section className="display" data-state={state} aria-busy={busy} aria-label="Display">
      <Rosette />
      <h1 className="plate">Calculator</h1>
      <div className="readout">
        <p ref={aboveRef} className="readout-above">
          {setCarets(above)}
        </p>
        {result !== null && (
          <p className="figure figure-result" data-size={sizeFor(result)}>
            {setResult(result)}
          </p>
        )}
        {result === null && error !== null && <p className="figure figure-error">{error}</p>}
        {!settled && (
          <p
            ref={typingRef}
            className={expression === '' ? 'figure figure-expression is-empty' : 'figure figure-expression'}
            data-size={sizeFor(expression)}
          >
            {expression === '' ? '0' : setCarets(expression)}
          </p>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
      <div className="microprint" aria-hidden="true">
        {MICROPRINT_GROUPS.map((group) => (
          <span key={group}>0123456789</span>
        ))}
      </div>
    </section>
  )
}
