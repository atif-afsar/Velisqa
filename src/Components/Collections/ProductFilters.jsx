import { EMPTY_PRODUCT_FILTERS } from '../../lib/productFilters'
import { CloseIcon } from '../UI/Icons'

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

const legendClass = 'eyebrow mb-4 text-ink'
const optionClass = 'flex min-h-10 cursor-pointer items-center gap-3 text-sm text-body hover:text-ink'
const checkboxClass = 'h-[18px] w-[18px] shrink-0 accent-ink'

function FacetGroup({ title, values, selected, onChange }) {
  if (!values?.length) return null
  return (
    <fieldset className="border-t border-line py-6">
      <legend className={legendClass}>{title}</legend>
      <div>
        {values.map((value) => (
          <label key={value} className={optionClass}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onChange(toggleValue(selected, value))}
              className={checkboxClass}
            />
            <span>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** All filter controls (used inside the filter drawer). */
export function FilterFields({ facets, filters, onChange }) {
  return (
    <div>
      <fieldset className="pb-6">
        <legend className={legendClass}>Price</legend>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="sr-only">Minimum price in rupees</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.minPrice}
              onChange={(event) => onChange({ ...filters, minPrice: event.target.value })}
              placeholder="Min ₹"
              className="field"
            />
          </label>
          <label>
            <span className="sr-only">Maximum price in rupees</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.maxPrice}
              onChange={(event) => onChange({ ...filters, maxPrice: event.target.value })}
              placeholder="Max ₹"
              className="field"
            />
          </label>
        </div>
      </fieldset>

      <FacetGroup title="Category" values={facets.categories ?? []} selected={filters.categories ?? []} onChange={(categories) => onChange({ ...filters, categories })} />
      <FacetGroup title="Metal" values={facets.metals} selected={filters.metals} onChange={(metals) => onChange({ ...filters, metals })} />
      <FacetGroup title="Colour" values={facets.colours} selected={filters.colours} onChange={(colours) => onChange({ ...filters, colours })} />
      <FacetGroup title="Style & occasion" values={facets.styles} selected={filters.styles} onChange={(styles) => onChange({ ...filters, styles })} />

      <fieldset className="border-t border-line py-6">
        <legend className={legendClass}>Availability</legend>
        <label className={optionClass}>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(event) => onChange({ ...filters, inStockOnly: event.target.checked })}
            className={checkboxClass}
          />
          In stock only
        </label>
      </fieldset>
    </div>
  )
}

/** Removable chips for active filters. */
export function ActiveFilterChips({ filters, onChange, onClear }) {
  const chips = [
    ...(filters.minPrice !== '' ? [{ label: `From ₹${filters.minPrice}`, remove: () => onChange({ ...filters, minPrice: '' }) }] : []),
    ...(filters.maxPrice !== '' ? [{ label: `Under ₹${filters.maxPrice}`, remove: () => onChange({ ...filters, maxPrice: '' }) }] : []),
    ...(filters.categories ?? []).map((value) => ({ label: value, remove: () => onChange({ ...filters, categories: filters.categories.filter((item) => item !== value) }) })),
    ...filters.metals.map((value) => ({ label: value, remove: () => onChange({ ...filters, metals: filters.metals.filter((item) => item !== value) }) })),
    ...filters.colours.map((value) => ({ label: value, remove: () => onChange({ ...filters, colours: filters.colours.filter((item) => item !== value) }) })),
    ...filters.styles.map((value) => ({ label: value, remove: () => onChange({ ...filters, styles: filters.styles.filter((item) => item !== value) }) })),
    ...(filters.inStockOnly ? [{ label: 'In stock', remove: () => onChange({ ...filters, inStockOnly: false }) }] : []),
  ]
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={chip.remove}
          className="inline-flex min-h-9 items-center gap-2 border border-line px-3 text-xs text-ink hover:border-ink"
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <CloseIcon size={12} />
        </button>
      ))}
      <button type="button" onClick={onClear ?? (() => onChange({ ...EMPTY_PRODUCT_FILTERS, sort: filters.sort }))} className="btn-link btn min-h-9 text-xs">
        Clear all
      </button>
    </div>
  )
}
