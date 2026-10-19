import { EventEmitter } from 'node:events'

/**
 * In-process notifications (replaces Supabase Realtime `postgres_changes`).
 * The API runs as a single PM2 process; if it is ever scaled out, swap this
 * for Redis pub/sub — the admin UI also polls every 60s as a fallback.
 */
export const eventBus = new EventEmitter()
eventBus.setMaxListeners(100)

export const EVENTS = Object.freeze({ orderCreated: 'order.created' })
