import { useId } from 'react'
import { PlusIcon } from '../UI/Icons'

/**
 * Visible questions & answers (native <details>, so every answer is in the HTML for
 * search and AI crawlers). Pages publish the same list as FAQPage JSON-LD.
 */
export default function FaqSection({ faqs, title = 'Questions, answered', eyebrow = 'Good to know', className = '' }) {
  const id = useId()
  if (!faqs?.length) return null
  return (
    <section aria-labelledby={id} className={`py-12 lg:py-16 ${className}`}>
      <div className="container-lux max-w-3xl">
        <p className="eyebrow text-center text-muted">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-center font-serif text-[1.75rem] leading-tight text-ink sm:text-[2.25rem]">
          {title}
        </h2>
        <div className="mt-8 border-b border-line">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group border-t border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[0.9375rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
                <h3 className="font-medium">{question}</h3>
                <PlusIcon size={16} className="shrink-0 transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed text-body">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
