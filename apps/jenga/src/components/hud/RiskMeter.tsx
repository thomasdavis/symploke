'use client'

export function RiskMeter({ risk }: { risk: number }) {
  const percent = (risk / 10) * 100
  const color =
    risk >= 7
      ? 'oklch(65% 0.25 25)' // red
      : risk >= 4
        ? 'oklch(75% 0.2 70)' // orange/amber
        : 'oklch(70% 0.2 145)' // green

  return (
    <div className="jenga-risk-meter">
      <div className="jenga-risk-meter-label">Risk: {risk.toFixed(1)} / 10</div>
      <div className="jenga-risk-meter-bar">
        <div
          className="jenga-risk-meter-fill"
          style={{
            width: `${percent}%`,
            background: color,
          }}
        />
      </div>
    </div>
  )
}
