import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type SectionProps = {
  title: string
  children: ReactNode
}

export function Terms() {
  return (
    <div className="flex-1 px-6 md:px-12 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <TermsHeader />

        <section className="bg-bg-secondary/70 border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <AgreementSection />
          <LimitationsSection />
          <PrivacySection />
          <DisclaimerSection />
          <ChangesSection />
        </section>

        <ReferenceSection />
      </div>
    </div>
  )
}

function TermsHeader() {
  return (
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-text-secondary font-semibold">
        Legal
      </p>
      <h1 className="text-3xl font-bold text-text">Terms of Service</h1>
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

function AgreementSection() {
  return (
    <SectionShell title="Agreement">
      <p className="text-sm text-text-secondary leading-relaxed">
        <strong>
          By accessing this Website, you are agreeing to be bound by these
          Website Terms of Service and agree that you are responsible for the
          agreement in accordance with any applicable local laws. IF YOU DO NOT
          AGREE TO ALL THE TERMS AND CONDITIONS OF THIS AGREEMENT, YOU ARE NOT
          PERMITTED TO ACCESS OR USE OUR SERVICES.
        </strong>
      </p>
    </SectionShell>
  )
}

function LimitationsSection() {
  return (
    <SectionShell title="Limitations">
      <p className="text-sm text-text-secondary leading-relaxed">
        You are responsible for your account's security and all activities on
        your account. You must not, in the use of this site, violate any
        applicable laws, including, without limitation, copyright laws, or any
        other laws regarding the security of your personal data, or otherwise
        misuse this site.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed">
        Sp(eye) reserves the right to remove or disable any account or any other
        content on this site at any time for any reason, without prior notice to
        you, if we believe that you have violated this agreement.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed">
        You agree that you will not upload, post, host, or transmit any content
        that:
      </p>
      <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
        <li>is unlawful or promotes unlawful activities;</li>
        <li>is or contains sexually obscene content;</li>
        <li>is libelous, defamatory, or fraudulent;</li>
        <li>is discriminatory or abusive toward any individual or group;</li>
        <li>
          is degrading to others on the basis of gender, race, class, ethnicity,
          national origin, religion, sexual preference, orientation, or
          identity, disability, or other classification, or otherwise represents
          or condones content that: is hate speech, discriminating, threatening,
          or pornographic; incites violence; or contains nudity or graphic or
          gratuitous violence;
        </li>
        <li>
          violates any person's right to privacy or publicity, or otherwise
          solicits, collects, or publishes data, including personal information
          and login information, about other Users without consent or for
          unlawful purposes in violation of any applicable international,
          federal, state, or local law, statute, ordinance, or regulation; or
        </li>
        <li>
          contains or installs any active malware or exploits/uses our platform
          for exploit delivery (such as part of a command or control system); or
          infringes on any proprietary right of any party, including patent,
          trademark, trade secret, copyright, right of publicity, or other
          rights.
        </li>
      </ul>
      <p className="text-sm text-text-secondary leading-relaxed">
        While using the Services, you agree that you will not:
      </p>
      <ul className="list-disc list-inside text-sm text-text-secondary leading-relaxed space-y-1">
        <li>
          harass, abuse, threaten, or incite violence towards any individual or
          group, including other Users and Sp(eye) contributors;
        </li>
        <li>
          use our servers for any form of excessive automated bulk activity
          (e.g., spamming), or rely on any other form of unsolicited advertising
          or solicitation through our servers or Services;
        </li>
        <li>
          attempt to disrupt or tamper with our servers in ways that could a)
          harm our Website or Services or b) place undue burden on our servers;
        </li>
        <li>access the Services in ways that exceed your authorization;</li>
        <li>
          falsely impersonate any person or entity, including any of our
          contributors, misrepresent your identity or the site's purpose, or
          falsely associate yourself with Sp(eye);
        </li>
        <li>
          violate the privacy of any third party, such as by posting another
          person's personal information without their consent;
        </li>
        <li>
          access or attempt to access any service on the Services by any means
          other than as permitted in this Agreement, or operating the Services
          on any computers or accounts which you do not have permission to
          operate;
        </li>
        <li>
          facilitate or encourage any violations of this Agreement or interfere
          with the operation, appearance, security, or functionality of the
          Services; or
        </li>
        <li>use the Services in any manner that is harmful to minors.</li>
      </ul>
      <p className="text-sm text-text-secondary leading-relaxed">
        Without limiting the foregoing, you will not transmit or post any
        content anywhere on the Services that violates any laws. Sp(eye)
        absolutely does not tolerate engaging in activity that significantly
        harms our Users. We will resolve disputes in favor of protecting our
        Users as a whole.
      </p>
    </SectionShell>
  )
}

function PrivacySection() {
  return (
    <SectionShell title="Privacy Policy">
      <p className="text-sm text-text-secondary leading-relaxed">
        If you use our Services, you must abide by our Privacy Policy. You
        acknowledge that you have read our{' '}
        <Link
          to="/privacy"
          className="text-primary underline"
          onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}
        >
          Privacy Policy
        </Link>{' '}
        and understand that it sets forth how we collect, use, and store your
        information. If you do not agree with our Privacy Statement, then you
        must stop using the Services immediately. Any person, entity, or service
        collecting data from the Services must comply with our Privacy
        Statement. Misuse of any User's Personal Information is prohibited. If
        you collect any Personal Information from a User, you agree that you
        will only use the Personal Information you gather for the purpose for
        which the User has authorized it. You agree that you will reasonably
        secure any Personal Information you have gathered from the Services, and
        you will respond promptly to complaints, removal requests, and 'do not
        contact' requests from us or Users.
      </p>
    </SectionShell>
  )
}

function DisclaimerSection() {
  return (
    <SectionShell title="Disclaimer">
      <p className="text-sm text-text-secondary leading-relaxed">
        EXCLUDING THE EXPLICITLY STATED WARRANTIES WITHIN THESE TERMS, WE ONLY
        OFFER OUR SERVICES ON AN 'AS-IS' BASIS. YOUR ACCESS TO AND USE OF THE
        SERVICES OR ANY CONTENT IS AT YOUR OWN RISK. YOU UNDERSTAND AND AGREE
        THAT THE SERVICES AND CONTENT ARE PROVIDED TO YOU ON AN 'AS IS,' 'WITH
        ALL FAULTS,' AND 'AS AVAILABLE' BASIS. WITHOUT LIMITING THE FOREGOING,
        TO THE FULL EXTENT PERMITTED BY LAW, SP(EYE) DISCLAIMS ALL WARRANTIES,
        EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
        TO THE EXTENT SUCH DISCLAIMER CONFLICTS WITH APPLICABLE LAW, THE SCOPE
        AND DURATION OF ANY APPLICABLE WARRANTY WILL BE THE MINIMUM PERMITTED
        UNDER SUCH LAW. SP(EYE) MAKES NO REPRESENTATIONS, WARRANTIES, OR
        GUARANTEES AS TO THE RELIABILITY, TIMELINESS, QUALITY, SUITABILITY,
        AVAILABILITY, ACCURACY, OR COMPLETENESS OF ANY KIND WITH RESPECT TO THE
        SERVICES, INCLUDING ANY REPRESENTATION OR WARRANTY THAT THE USE OF THE
        SERVICES WILL (A) BE TIMELY, UNINTERRUPTED, OR ERROR-FREE, OR OPERATE IN
        COMBINATION WITH ANY OTHER HARDWARE, SOFTWARE, SYSTEM, OR DATA, (B) MEET
        YOUR REQUIREMENTS OR EXPECTATIONS, (C) BE FREE FROM ERRORS OR THAT
        DEFECTS WILL BE CORRECTED, OR (D) BE FREE OF VIRUSES OR OTHER HARMFUL
        COMPONENTS. SP(EYE) ALSO MAKES NO REPRESENTATIONS OR WARRANTIES OF ANY
        KIND WITH RESPECT TO CONTENT; USER CONTENT IS PROVIDED BY AND IS SOLELY
        THE RESPONSIBILITY OF THE RESPECTIVE USER PROVIDING THAT CONTENT. NO
        ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED FROM SP(EYE) OR
        THROUGH THE SERVICES, WILL CREATE ANY WARRANTY NOT EXPRESSLY MADE
        HEREIN. SP(EYE) DOES NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME
        RESPONSIBILITY FOR ANY USER CONTENT ON THE SERVICES OR ANY HYPERLINKED
        WEBSITE OR THIRD-PARTY SERVICE, AND SP(EYE) WILL NOT BE A PARTY TO OR IN
        ANY WAY BE RESPONSIBLE FOR TRANSACTIONS BETWEEN YOU AND THIRD PARTIES.
        IF APPLICABLE LAW DOES NOT ALLOW THE EXCLUSION OF SOME OR ALL OF THE
        ABOVE IMPLIED OR STATUTORY WARRANTIES TO APPLY TO YOU, THE ABOVE
        EXCLUSIONS WILL APPLY TO YOU TO THE FULLEST EXTENT PERMITTED BY
        APPLICABLE LAW.
      </p>
    </SectionShell>
  )
}

function ChangesSection() {
  return (
    <SectionShell title="Changes">
      <p className="text-sm text-text-secondary leading-relaxed">
        Sp(eye) may revise these Terms of Service for its Website at any time
        without prior notice. By using this Website, you are agreeing to be
        bound by the current version of these Terms of Service.
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
