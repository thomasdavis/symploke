export default function Loading() {
  return (
    <div className="jenga-loading">
      <div className="jenga-loading-spinner" />
      <div className="jenga-loading-text">Resolving dependencies...</div>
      <div className="jenga-loading-status">Crawling npm registry</div>
    </div>
  )
}
