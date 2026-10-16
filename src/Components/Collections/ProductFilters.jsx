import { useEffect, useState } from 'react'
import {
  countActiveProductFilters,
  EMPTY_PRODUCT_FILTERS,
  PRODUCT_SORT_OPTIONS,
} from '../../lib/productFilters'
import CustomSelect from '../Common/CustomSelect'

function toggleValue(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function FacetGroup({ title, values, selected, onChange }) {
  if (!values.length) return null
  return (
    <fieldset className="border-t border-muted/12 py-5">
      <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-body">{title}</legend>
      <div className="space-y-2.5">
        {values.map((value) => (
          <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm text-body">
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onChange(toggleValue(selected, value))}
              className="h-4 w-4 rounded border-muted/40 accent-ink"
            />
            <span>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function FilterFields({ facets, filters, onChange }) {
  return (
    <div>
      <fieldset className="pb-5">
        <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-body">Price range</legend>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">Minimum price</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.minPrice}
              onChange={(event) => onChange({ ...filters, minPrice: event.target.value })}
              placeholder="Min ₹"
              className="w-full rounded-lg border border-muted/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
            />
          </label>
          <label>
            <span className="sr-only">Maximum price</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.maxPrice}
              onChange={(event) => onChange({ ...filters, maxPrice: event.target.value })}
              placeholder="Max ₹"
              className="w-full rounded-lg border border-muted/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
            />
          </label>
        </div>
      </fieldset>

      <FacetGroup title="Category" values={facets.categories ?? []} selected={filters.categories ?? []} onChange={(categories) => onChange({ ...filters, categories })} />
      <FacetGroup title="Metal" values={facets.metals} selected={filters.metals} onChange={(metals) => onChange({ ...filters, metals })} />
      <FacetGroup title="Colour" values={facets.colours} selected={filters.colours} onChange={(colours) => onChange({ ...filters, colours })} />
      <FacetGroup title="Style & occasion" values={facets.styles} selected={filters.styles} onChange={(styles) => onChange({ ...filters, styles })} />

      <fieldset className="border-t border-muted/12 py-5">
        <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-body">Availability</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-body">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(event) => onChange({ ...filters, inStockOnly: event.target.checked })}
            className="h-4 w-4 rounded border-muted/40 accent-ink"
          />
          In-stock pieces only
        </label>
      </fieldset>

      <label className="block border-t border-muted/12 py-5">
        <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-body">Minimum rating</span>
        <select
          value={filters.minRating}
          onChange={(event) => onChange({ ...filters, minRating: event.target.value })}
          className="w-full rounded-lg border border-muted/20 bg-white px-3 py-2.5 text-sm text-body outline-none"
        >
          <option value="">Any rating</option>
          <option value="4">4★ & up</option>
          <option value="4.5">4.5★ & up</option>
        </select>
      </label>
    </div>
  )
}

export function ProductFilterSidebar({ stickyTopClass = 'top-[calc(var(--nav-height)+1rem)]', ...props }) {
  const activeCount = countActiveProductFilters(props.filters)
  return (
    <aside className="hidden w-56 shrink-0 lg:block xl:w-60">
      <div className={`sticky ${stickyTopClass} border border-black/8 bg-white p-4 xl:p-5`}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h4 className="text-[13px] font-semibold text-ink">Filters</h4>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={props.onClear}
              className="text-[11px] font-medium text-ink underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <FilterFields {...props} />
      </div>
    </aside>
  )
}

export default function ProductFilters({ facets, filters, onChange, onClear, resultCount }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const activeCount = countActiveProductFilters(filters)

  useEffect(() => {
    if (!drawerOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-muted/12 bg-white/55 p-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex py-[2px] px-[6px] items-center gap-1 rounded-sm border border-ink/20 bg-white text-[7px] font-semibold uppercase tracking-[0.06em] text-ink lg:hidden outline-none"
        >
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="rounded-sm bg-ink px-1 py-0.2 text-[5.5px] font-bold text-white leading-none">
              {activeCount}
            </span>
          )}
        </button>

        <p className="text-xs text-muted">
          <span className="font-semibold text-ink">{resultCount}</span> matching piece{resultCount === 1 ? '' : 's'}
        </p>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-muted sm:inline">Sort</span>
          <CustomSelect
            value={filters.sort}
            onChange={(value) => onChange({ ...filters, sort: value })}
            options={PRODUCT_SORT_OPTIONS}
          />
        </div>
      </div>

      <ActiveFilterChips filters={filters} onChange={onChange} onClear={onClear} />

      {drawerOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/55" onClick={() => setDrawerOpen(false)} aria-label="Close filters" />
          <section role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title" className="absolute inset-y-0 right-0 flex w-[min(92vw,400px)] flex-col bg-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-muted/15 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{resultCount} results</p>
                <h3 id="filter-drawer-title" className="font-serif text-xl">Filter pieces</h3>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-muted/20 text-xl" aria-label="Close filters">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FilterFields facets={facets} filters={filters} onChange={onChange} />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-muted/15 bg-white p-4">
              <button type="button" onClick={() => onChange({ ...EMPTY_PRODUCT_FILTERS })} className="rounded-sm border border-ink/20 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink">Clear all</button>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-sm bg-ink px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-white">Show {resultCount}</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export function ActiveFilterChips({ filters, onChange, onClear }) {
  const chips = [
    ...(filters.minPrice !== '' ? [{ label: `From ₹${filters.minPrice}`, remove: () => onChange({ ...filters, minPrice: '' }) }] : []),
    ...(filters.maxPrice !== '' ? [{ label: `Under ₹${filters.maxPrice}`, remove: () => onChange({ ...filters, maxPrice: '' }) }] : []),
    ...(filters.categories ?? []).map((value) => ({ label: value, remove: () => onChange({ ...filters, categories: filters.categories.filter((item) => item !== value) }) })),
    ...filters.metals.map((value) => ({ label: value, remove: () => onChange({ ...filters, metals: filters.metals.filter((item) => item !== value) }) })),
    ...filters.colours.map((value) => ({ label: value, remove: () => onChange({ ...filters, colours: filters.colours.filter((item) => item !== value) }) })),
    ...filters.styles.map((value) => ({ label: value, remove: () => onChange({ ...filters, styles: filters.styles.filter((item) => item !== value) }) })),
    ...(filters.inStockOnly ? [{ label: 'In stock', remove: () => onChange({ ...filters, inStockOnly: false }) }] : []),
    ...(filters.minRating !== '' ? [{ label: `${filters.minRating}★ & up`, remove: () => onChange({ ...filters, minRating: '' }) }] : []),
  ]

  if (!chips.length) return null
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button key={chip.label} type="button" onClick={chip.remove} className="rounded-full border border-line bg-[#fffaf0] px-3 py-1.5 text-[11px] font-medium text-body">
          {chip.label} <span aria-hidden>×</span>
        </button>
      ))}
      <button type="button" onClick={onClear} className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink">Clear all</button>
    </div>
  )
}
