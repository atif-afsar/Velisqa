import { Link } from 'react-router-dom'

/** Eyebrow + serif title, optionally with a right-aligned "view all" link. */
export default function SectionHeading({ id, eyebrow, title, linkTo, linkLabel = 'View all', align = 'center', children }) {
  const centered = align === 'center' && !linkTo
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'flex flex-wrap items-end justify-between gap-4'}>
      <div>
        {eyebrow && <p className="eyebrow text-muted">{eyebrow}</p>}
        <h2 id={id} className="type-section mt-3 text-ink">
          {title}
        </h2>
        {children}
      </div>
      {linkTo && (
        <Link to={linkTo} className="btn-link btn shrink-0 text-ink">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
