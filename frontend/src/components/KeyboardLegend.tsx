const SHORTCUTS: [keys: string[], action: string][] = [
  [['0–9', '.'], 'Numbers'],
  [['+', '-', '*', '/'], 'Operators'],
  [['^', '%'], 'Power, percent'],
  [['r'], 'Square root'],
  [['(', ')'], 'Parentheses'],
  [['Enter'], 'Equals'],
  [['Backspace'], 'Delete last'],
  [['Esc'], 'Clear'],
]

// Only shown where there is a physical keyboard (see Calculator.css).
export function KeyboardLegend() {
  return (
    <section className="legend" aria-labelledby="legend-title">
      <h2 id="legend-title" className="legend-title">
        Keyboard
      </h2>
      <dl className="legend-list">
        {SHORTCUTS.map(([keys, action]) => (
          <div key={action} className="legend-row">
            <dt>
              {keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
