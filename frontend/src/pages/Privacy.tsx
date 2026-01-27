import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  children: ReactNode
}

export function Privacy() {
  return (
    <div className="flex-1 px-6 md:px-12 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <PrivacyHeader />

        <section className="bg-bg-secondary/70 border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <WhatSection />
          <HowCollectSection />
          <HowStoreSection />
          <RightsSection />
        </section>

        <ReferenceSection />
      </div>
    </div>
  )
}

function PrivacyHeader() {
  return (
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-text-secondary font-semibold">
        Legal
      </p>
      <h1 className="text-3xl font-bold text-text">Privacy Policy</h1>
      <p className="text-sm text-text-secondary">
        Thanks for trusting Sp(eye) ('Sp(eye)', 'we', 'us', 'our') with your
        personal information! We take our responsibility to you very seriously,
        and so this Privacy Statement describes how we handle your data.
      </p>
      <p className="text-sm text-text-secondary">
        This Privacy Statement applies to all websites we own and operate and to
        all services we provide (collectively, the 'Services'). So...PLEASE READ
        THIS PRIVACY STATEMENT CAREFULLY. By using the Services, you are
        expressly and voluntarily accepting the terms and conditions of this
        Privacy Statement and our Terms of Service, which include allowing us to
        process information about you.
      </p>
      <p className="text-sm text-text-secondary">
        Under this Privacy Statement, we are the data controller responsible for
        processing your personal information. Our contact information appears at
        the end of this Privacy Statement.
      </p>
    </header>
  )
}

function SectionShell({ title, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      {children}
    </div>
  )
}

function WhatSection() {
  return (
    <SectionShell title="What data do we collect?">
      <p className="text-sm text-text-secondary leading-relaxed">
        Sp(eye) collects the following data:
        <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
          <li>Information about each reading test</li>
          <li>How long you've been reading on the website</li>
          <li>custom texts</li>
        </ul>
      </p>
    </SectionShell>
  )
}

function HowCollectSection() {
  return (
    <SectionShell title="How do we collect your data?">
      <p className="text-sm text-text-secondary leading-relaxed">
        You directly provide most of the data we collect. We collect data and
        process data when you:
        <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
          <li>Create an account</li>
          <li>Complete a reading test</li>
        </ul>
      </p>
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
    <SectionShell
      title="What are your data protection rights?
"
    >
      <p className="text-sm text-text-secondary leading-relaxed">
        Sp(eye) would like to make sure you are fully aware of all of your data
        protection rights. Every user is entitled to the following:
        <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
          <li>
            {' '}
            The right to access - You have the right to request Sp(eye) for
            copies of your personal data. We may limit the number of times this
            request can be made to depending on the size of the request.
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
            mentioned in the "How will we use your data?" section will not be
            deleted, as it is essential in preventing the exploitation of the
            website)
          </li>
          <li>
            The right to restrict processing - You have the right to request
            that Sp(eye) restrict the processing of your personal data, under
            certain conditions.
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
      </p>
    </SectionShell>
  )
}

function ReferenceSection() {
  return (
    <p className="text-sm text-text-secondary leading-relaxed">
      Terms based on{' '}
      <a className="text-primary underline" href="https://glitch.com/legal">
        Glitch terms
      </a>
    </p>
  )
}
