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
    <fieldset className="border-t border-[#847377]/12 py-5">
      <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#514347]">{title}</legend>
      <div className="space-y-2.5">
        {values.map((value) => (
          <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm text-[#514347]">
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onChange(toggleValue(selected, value))}
              className="h-4 w-4 rounded border-[#847377]/40 accent-[#3d0a21]"
            />
            <span>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function FilterFields({ facets, filters, onChange }) {
  return (
    <div>
      <fieldset className="pb-5">
        <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#514347]">Price range</legend>
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
              className="w-full rounded-lg border border-[#847377]/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3d0a21]/40"
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
              className="w-full rounded-lg border border-[#847377]/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3d0a21]/40"
            />
          </label>
        </div>
      </fieldset>

      <FacetGroup title="Category" values={facets.categories ?? []} selected={filters.categories ?? []} onChange={(categories) => onChange({ ...filters, categories })} />
      <FacetGroup title="Metal" values={facets.metals} selected={filters.metals} onChange={(metals) => onChange({ ...filters, metals })} />
      <FacetGroup title="Colour" values={facets.colours} selected={filters.colours} onChange={(colours) => onChange({ ...filters, colours })} />
      <FacetGroup title="Style & occasion" values={facets.styles} selected={filters.styles} onChange={(styles) => onChange({ ...filters, styles })} />

      <fieldset className="border-t border-[#847377]/12 py-5">
        <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#514347]">Availability</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#514347]">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(event) => onChange({ ...filters, inStockOnly: event.target.checked })}
            className="h-4 w-4 rounded border-[#847377]/40 accent-[#3d0a21]"
          />
          In-stock pieces only
        </label>
      </fieldset>

      <label className="block border-t border-[#847377]/12 py-5">
        <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#514347]">Minimum rating</span>
        <select
          value={filters.minRating}
          onChange={(event) => onChange({ ...filters, minRating: event.target.value })}
          className="w-full rounded-lg border border-[#847377]/20 bg-white px-3 py-2.5 text-sm text-[#514347] outline-none"
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
          <h4 className="text-[13px] font-semibold text-[#130006]">Filters</h4>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={props.onClear}
              className="text-[11px] font-medium text-[#130006] underline-offset-2 hover:underline"
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#847377]/12 bg-white/55 p-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#3d0a21]/20 bg-white px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#3d0a21] lg:hidden"
        >
          Filters {activeCount > 0 && <span className="rounded-full bg-[#3d0a21] px-1.5 py-0.5 text-[9px] text-white">{activeCount}</span>}
        </button>

        <p className="text-xs text-[#847377]">
          <span className="font-semibold text-[#130006]">{resultCount}</span> matching piece{resultCount === 1 ? '' : 's'}
        </p>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-[#847377] sm:inline">Sort</span>
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
          <button type="button" className="absolute inset-0 bg-[#130006]/55" onClick={() => setDrawerOpen(false)} aria-label="Close filters" />
          <section role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title" className="absolute inset-y-0 right-0 flex w-[min(92vw,400px)] flex-col bg-[#fdf9f4] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#847377]/15 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">{resultCount} results</p>
                <h3 id="filter-drawer-title" className="font-serif text-xl">Filter pieces</h3>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#847377]/20 text-xl" aria-label="Close filters">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FilterFields facets={facets} filters={filters} onChange={onChange} />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[#847377]/15 bg-white p-4">
              <button type="button" onClick={() => onChange({ ...EMPTY_PRODUCT_FILTERS })} className="rounded-full border border-[#3d0a21]/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#3d0a21]">Clear all</button>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full bg-[#3d0a21] px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#f7ead0]">Show {resultCount}</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function ActiveFilterChips({ filters, onChange, onClear }) {
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
        <button key={chip.label} type="button" onClick={chip.remove} className="rounded-full border border-[#d4af37]/35 bg-[#fffaf0] px-3 py-1.5 text-[11px] font-medium text-[#514347]">
          {chip.label} <span aria-hidden>×</span>
        </button>
      ))}
      <button type="button" onClick={onClear} className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6f334a]">Clear all</button>
    </div>
  )
}
