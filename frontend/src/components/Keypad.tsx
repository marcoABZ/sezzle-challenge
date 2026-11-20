import type { Key } from '../hooks/calculatorState.ts'
import { KEYS } from './keys.ts'
import type { KeyDef } from './keys.ts'

type KeypadProps = {
  onPress: (key: Key) => void
  // The key a physical key press just landed on, lit for a moment.
  flashed: Key | null
}

function BackspaceIcon() {
  return (
    <svg className="key-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.5 5.5h11a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-11L3 12z" />
      <path d="M11 9.5l5 5m0-5l-5 5" />
    </svg>
  )
}

// Two labels are drawn rather than typed: no font has a backspace sign, and a
// bare caret reads as a logic symbol.
function Label({ def }: { def: KeyDef }) {
  if (def.key === 'backspace') return <BackspaceIcon />
  if (def.key === 'power') {
    return (
      <span>
        x<sup>y</sup>
      </span>
    )
  }
  return def.label
}

export function Keypad({ onPress, flashed }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Keypad">
      {KEYS.map((def) => (
        <button
          key={def.key}
          type="button"
          className={`key key-${def.kind}`}
          data-key={def.key}
          data-flashed={flashed === def.key ? '' : undefined}
          aria-label={def.name}
          onClick={() => onPress(def.key)}
        >
          <Label def={def} />
        </button>
      ))}
    </div>
  )
}
