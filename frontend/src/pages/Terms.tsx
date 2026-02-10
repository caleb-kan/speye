import { LegalReference } from '../components/legal/LegalReference'
import { TermsHeader } from '../components/legal/terms/TermsHeader'
import { TermsSections } from '../components/legal/terms/TermsSections'

export function Terms() {
  return (
    <div className="flex-1 px-6 md:px-12 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <TermsHeader />
        <TermsSections />
        <LegalReference />
      </div>
    </div>
  )
}
