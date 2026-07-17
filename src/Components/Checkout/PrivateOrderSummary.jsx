import { formatInr } from '../../lib/cartStock'

export default function PrivateOrderSummary({ order }) {
  return (
    <section className="rounded-2xl border border-[#d4af37]/20 bg-white/70 p-5 shadow-[0_14px_44px_rgba(19,0,6,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">
            Order reference
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-[#3d0a21]">{order.orderRef}</p>
        </div>
        <p className="font-serif text-xl font-semibold text-[#3d0a21]">
          {formatInr(order.grandTotal)}
        </p>
      </div>

      <ul className="mt-5 divide-y divide-[#d4af37]/15 border-y border-[#d4af37]/15">
        {(order.items || []).map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center gap-3 py-3">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="h-14 w-12 shrink-0 rounded-md bg-[#f1ede8] object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#130006]">{item.name}</p>
              <p className="mt-0.5 text-xs text-[#847377]">
                {item.quantity} × {formatInr(item.unitPrice)}
              </p>
            </div>
            <p className="text-sm font-medium text-[#3d0a21]">{formatInr(item.lineTotal)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
