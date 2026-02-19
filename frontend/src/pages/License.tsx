import Markdown from 'react-markdown'
import { useEffect, useState } from 'react'

export function License() {
  const [licenseText, setLicenseText] = useState('')

  useEffect(() => {
    fetch('/license.txt')
      .then((res) => res.text())
      .then((text) => setLicenseText(text))
  }, [])

  return (
    <div className="flex-1 px-6 md:px-12 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Markdown>{licenseText}</Markdown>
      </div>
    </div>
  )
}
