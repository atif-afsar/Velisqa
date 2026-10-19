const ITEMS = ['Skin-safe finish', 'Free shipping on prepaid orders', 'Cash on delivery', '5-day easy returns', 'Gift-ready packaging', 'Secure payments']

function Row({ hidden = false }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ITEMS.map((item) => (
        <li key={item} className="flex items-center whitespace-nowrap px-5 text-[0.6875rem] font-medium uppercase tracking-[0.18em]">
          <span className="mr-5 text-[0.5rem] text-white/50" aria-hidden="true">◆</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Slow ticker of service promises under the hero. Static under reduced motion. */
export default function TrustMarquee() {
  return (
    <div className="overflow-hidden border-y border-ink bg-ink py-3 text-white" role="region" aria-label="Shopping with Velisqa">
      <div className="marquee-track">
        <Row />
        <Row hidden />
      </div>
    </div>
  )
}
