import { SectionShell } from '../SectionShell'

export function PrivacySections() {
  return (
    <section className="bg-bg-secondary/70 border border-text-secondary/20 rounded-2xl p-6 shadow-sm space-y-4">
      <WhatSection />
      <HowCollectSection />
      <HowStoreSection />
      <RightsSection />
    </section>
  )
}

function WhatSection() {
  return (
    <SectionShell title="What data do we collect?">
      <p className="text-sm text-text-secondary leading-relaxed">
        Sp(eye) collects the following data:
      </p>
      <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
        <li>Information about each reading test</li>
        <li>How long you've been reading on the website</li>
        <li>Custom texts</li>
      </ul>
      <p className="text-sm text-text-secondary leading-relaxed">
        Sp(eye) does NOT collect:
      </p>
      <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
        <li>
          Eye tracking calibration data (they are stored in your browser's local
          storage)
        </li>
      </ul>
    </SectionShell>
  )
}

function HowCollectSection() {
  return (
    <SectionShell title="How do we collect your data?">
      <p className="text-sm text-text-secondary leading-relaxed">
        You directly provide most of the data we collect. We collect data and
        process data when you:
      </p>
      <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
        <li>Create an account</li>
        <li>Complete a reading test</li>
      </ul>
    </SectionShell>
  )
}

function HowStoreSection() {
  return (
    <SectionShell title="How do we store your data?">
      <p className="text-sm text-text-secondary leading-relaxed">
        Sp(eye) securely stores your data using Supabase.
      </p>
    </SectionShell>
  )
}

function RightsSection() {
  return (
    <SectionShell title="What are your data protection rights?">
      <p className="text-sm text-text-secondary leading-relaxed">
        Sp(eye) would like to make sure you are fully aware of all of your data
        protection rights. Every user is entitled to the following:
      </p>
      <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
        <li>
          The right to access - You have the right to request Sp(eye) for copies
          of your personal data. We may limit the number of times this request
          can be made to depending on the size of the request.
        </li>
        <li>
          The right to rectification - You have the right to request that
          Sp(eye) correct any information you believe is inaccurate. You also
          have the right to request Sp(eye) to complete the information you
          believe is incomplete.
        </li>
        <li>
          The right to erasure - You have the right to request that Sp(eye)
          erase your personal data, under certain conditions. (Hashed data
          mentioned in the &quot;How will we use your data?&quot; section will
          not be deleted, as it is essential in preventing the exploitation of
          the website)
        </li>
        <li>
          The right to restrict processing - You have the right to request that
          Sp(eye) restrict the processing of your personal data, under certain
          conditions.
        </li>
        <li>
          The right to object to processing - You have the right to object to
          Sp(eye) processing of your personal data, under certain conditions.
        </li>
        <li>
          The right to data portability - You have the right to request that
          Sp(eye) transfer the data that we have collected to another
          organization, or directly to you, under certain conditions.
        </li>
      </ul>
    </SectionShell>
  )
}
