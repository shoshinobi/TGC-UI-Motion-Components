import { useState } from 'react'

export function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/** One scrollable, copyable code panel in the bottom dock. */
export function SpecCard({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className='spec'>
      <div className='spec-head'>
        <span>{title}</span>
        <button
          className='copy-btn'
          data-copied={copied}
          onClick={() => {
            navigator.clipboard.writeText(text).then(
              () => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              },
              () => {},
            )
          }}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre>{text}</pre>
    </div>
  )
}
