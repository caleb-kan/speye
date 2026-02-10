import { LegalReference } from '../components/legal/LegalReference'
import { PrivacyHeader } from '../components/legal/privacy/PrivacyHeader'
import { PrivacySections } from '../components/legal/privacy/PrivacySections'

export function Privacy() {
  return (
    <div className="flex-1 px-6 md:px-12 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <PrivacyHeader />
        <PrivacySections />
        <LegalReference />
      </div>
    </div>
  )
}
