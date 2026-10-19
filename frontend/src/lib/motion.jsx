/* eslint-disable react-refresh/only-export-components */
/**
 * Minimal stand-in for the framer-motion API surface this site used.
 *
 * The redesign uses CSS-only micro-interactions, so `motion.*` elements render
 * as plain elements and animation props are dropped. This removes ~130 KB of JS
 * without touching every component that still imports `motion`.
 */
import { forwardRef, useSyncExternalStore } from 'react'

const MOTION_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileInView',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'viewport',
  'layout',
  'layoutId',
  'custom',
  'drag',
  'dragConstraints',
  'onAnimationStart',
  'onAnimationComplete',
])

const cache = new Map()

function createMotionComponent(tag) {
  const Component = forwardRef(function MotionElement(props, ref) {
    const domProps = {}
    for (const key in props) {
      if (!MOTION_PROPS.has(key)) domProps[key] = props[key]
    }
    const Tag = tag
    return <Tag ref={ref} {...domProps} />
  })
  Component.displayName = `motion.${tag}`
  return Component
}

export const motion = new Proxy(
  {},
  {
    get(_target, tag) {
      if (typeof tag !== 'string') return undefined
      if (!cache.has(tag)) cache.set(tag, createMotionComponent(tag))
      return cache.get(tag)
    },
  },
)

export function AnimatePresence({ children }) {
  return children ?? null
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(callback) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
}
