import './Legend.css'

export function Legend() {
  return (
    <div className="legend">
      <span className="legend-item">
        <i className="legend-swatch legend-swatch-left" /> Left hand
      </span>
      <span className="legend-item">
        <i className="legend-swatch legend-swatch-right" /> Right hand
      </span>
      <span className="legend-item">
        <i className="legend-swatch legend-swatch-input" /> Your input
      </span>
      <span className="legend-item">
        <i className="legend-swatch legend-swatch-required" /> Play this next
      </span>
    </div>
  )
}
