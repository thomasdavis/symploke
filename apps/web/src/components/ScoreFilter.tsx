'use client'

import './ScoreFilter.css'

type ScoreFilterProps = {
  value: number
  onChange: (value: number) => void
  resultCount?: number
  resultLabel?: string
}

export function ScoreFilter({
  value,
  onChange,
  resultCount,
  resultLabel = 'shown',
}: ScoreFilterProps) {
  return (
    <div className="score-filter">
      <div className="score-filter__control">
        <label htmlFor="score-filter-slider">
          Min Score: <strong>{Math.round(value * 100)}%</strong>
        </label>
        <input
          id="score-filter-slider"
          type="range"
          min="0"
          max="100"
          value={value * 100}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="score-filter__slider"
        />
      </div>
      {resultCount !== undefined && (
        <span className="score-filter__count">
          {resultCount} {resultLabel}
        </span>
      )}
    </div>
  )
}
