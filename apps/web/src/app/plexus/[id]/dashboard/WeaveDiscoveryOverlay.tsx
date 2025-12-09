'use client'

interface WeaveDiscoveryOverlayProps {
  repoPairsChecked: number
  repoPairsTotal: number
  weavesFound: number
  progress: number
}

export function WeaveDiscoveryOverlay({
  repoPairsChecked,
  repoPairsTotal,
  weavesFound,
  progress,
}: WeaveDiscoveryOverlayProps) {
  return (
    <div className="weave-discovery-overlay">
      <div className="weave-discovery-overlay__content">
        <div className="weave-discovery-overlay__spinner" />
        <div className="weave-discovery-overlay__text">
          <span className="weave-discovery-overlay__title">Discovering weaves...</span>
          <span className="weave-discovery-overlay__progress">
            {repoPairsChecked} / {repoPairsTotal} pairs checked
          </span>
          {weavesFound > 0 && (
            <span className="weave-discovery-overlay__found">
              {weavesFound} weave{weavesFound !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
        <div className="weave-discovery-overlay__bar">
          <div
            className="weave-discovery-overlay__bar-fill"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
