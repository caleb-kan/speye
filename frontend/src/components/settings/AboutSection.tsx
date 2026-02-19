import { Link } from 'react-router-dom'

export function AboutSection() {
  return (
    <section className="mb-5">
      <h2 className="text-sm text-text-secondary mb-2 text-center">about</h2>
      <div className="bg-bg-secondary rounded-lg p-3">
        <p className="text-sm text-text mb-3 text-center">
          sp(eye) is an adaptive speed reading platform that helps you read
          faster while maintaining comprehension.
        </p>
        <div className="text-xs text-text-secondary space-y-1.5">
          <div className="flex gap-2">
            <span className="text-primary font-medium shrink-0">standard</span>
            <span>Fixed WPM speed reading with word highlighting</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-medium shrink-0">adaptive</span>
            <span>Eye-tracking based adaptive speed</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-medium shrink-0">
              summarised
            </span>
            <span>AI-powered summary for non-fiction texts (via Library)</span>
          </div>
        </div>
        <div className="text-xs text-text-secondary mt-3 pt-3 border-t border-bg-tertiary">
          <Link to="/license" className="text-primary hover:underline">
            License
          </Link>
        </div>
      </div>
    </section>
  )
}
