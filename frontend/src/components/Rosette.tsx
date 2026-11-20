type Layer = { ring: number; roll: number; pen: number; wave: number; phase: number }

// Three layers that rotate against each other, so their interference shifts
// like the fine-line rosette printed under a banknote's figures.
const LAYERS: Layer[] = [
  { ring: 60, roll: 7, pen: 34, wave: 0.04, phase: 0 },
  { ring: 54, roll: 9, pen: 30, wave: 0.05, phase: 1.2 },
  { ring: 44, roll: 11, pen: 24, wave: 0.06, phase: 2.1 },
]

const STEPS = 1200

// A pen on a circle rolling around a ring (an epitrochoid), with a slow wave
// on its radius: the curve a banknote's lathe engraves.
function trace({ ring, roll, pen, wave, phase }: Layer): string {
  const points: string[] = []
  for (let i = 0; i <= STEPS; i++) {
    const t = (2 * Math.PI * roll * i) / STEPS
    const scale = 1 + wave * Math.sin((7 * t) / roll + phase)
    const spin = ((ring + roll) / roll) * t
    const x = ((ring + roll) * Math.cos(t) - pen * Math.cos(spin)) * scale
    const y = ((ring + roll) * Math.sin(t) - pen * Math.sin(spin)) * scale
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return `M${points.join('L')}Z`
}

const PATHS = LAYERS.map(trace)

export function Rosette() {
  return (
    <svg className="rosette" viewBox="-110 -110 220 220" aria-hidden="true" focusable="false">
      {PATHS.map((path) => (
        <g key={path} className="rosette-layer">
          <path d={path} />
        </g>
      ))}
    </svg>
  )
}
