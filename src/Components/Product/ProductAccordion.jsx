import { useId, useState } from 'react'

const iconPaths = {
  truck: 'M8 17h8M3 9h12l3 4v5H3V9zM16 9V6a1 1 0 00-1-1H6a1 1 0 00-1 1v3',
  shield: 'M12 3l7 4v5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V7l7-4z',
  sparkle: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M18.4 5.6l-2.1 2.1M7.9 16.1l-2.1 2.1',
  chat: 'M8 10h8M8 14h5M6 18l-2 2V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H8z',
  document:
    'M9 12h6m-6 4h4M8 4h5l5 5v11a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z',
}

function PolicyIcon({ name }) {
  const d = iconPaths[name] ?? iconPaths.document
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-ink/5 text-ink sm:h-10 sm:w-10">
      <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
      </svg>
    </span>
  )
}

function PlusToggle({ open }) {
  return (
    <span
      className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center self-stretch bg-ink transition-colors duration-300 group-hover:bg-ink sm:h-[58px] sm:w-[58px]"
      aria-hidden
    >
      <span className="absolute h-[2px] w-4 rounded-full bg-white" />
      <span
        className={`absolute h-4 w-[2px] rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'scale-y-0' : 'scale-y-100'
        }`}
      />
    </span>
  )
}

export function AccordionItem({ id, title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const buttonId = useId()

  return (
    <div className="overflow-hidden rounded-lg bg-[#f5f4f2]">
      <h3>
        <button
          id={buttonId}
          type="button"
          className="group flex w-full items-stretch text-left"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex flex-1 items-center gap-3 px-5 py-4">
            {icon && <PolicyIcon name={icon} />}
            <span className="min-w-0 flex-1 font-serif text-base leading-snug text-ink transition-colors group-hover:text-ink sm:text-lg">
              {title}
            </span>
          </span>
          <PlusToggle open={open} />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 pb-5 pt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function ProductAccordion({ description, policySections, footerLink, compact = false }) {
  return (
    <div
      className={
        compact
          ? 'mt-6'
          : 'overflow-hidden rounded-2xl border border-line bg-mist p-4 shadow-[0_24px_64px_-32px_rgba(17, 17, 17,0.18)] sm:p-6'
      }
    >
      {!compact && (
        <div className="mb-4 px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Product information</p>
          <p className="mt-1 font-serif text-lg text-ink sm:text-xl">Details &amp; policies</p>
        </div>
      )}

      <div className="space-y-3">
        <AccordionItem id="about" title="Description" icon={compact ? null : 'document'} defaultOpen>
          <p className="text-sm leading-[1.75] text-body sm:text-[0.9375rem]">{description}</p>
        </AccordionItem>

        {policySections.map((section) => (
          <AccordionItem
            key={section.id}
            id={section.id}
            title={section.title}
            icon={compact ? null : section.icon}
            defaultOpen={false}
          >
            <ul className="space-y-3 text-sm leading-[1.7] text-body">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </AccordionItem>
        ))}
      </div>

      {footerLink && (
        <div className="mt-4 px-1 text-center">
          {footerLink}
        </div>
      )}
    </div>
  )
}
