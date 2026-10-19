import { Link } from 'react-router-dom'

const VARIANTS = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  light: 'btn btn-light',
  link: 'btn btn-link',
}

/**
 * Design-system button. Renders a router <Link> when `to` is set, <a> for `href`,
 * otherwise a <button>.
 */
export default function Button({ variant = 'primary', to, href, className = '', children, ...rest }) {
  const classes = `${VARIANTS[variant] ?? VARIANTS.primary} ${className}`.trim()
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}
