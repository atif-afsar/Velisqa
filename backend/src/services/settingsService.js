import { C, getDb } from '../config/db.js'

/**
 * Hero banners managed from /admin/hero. An empty list means "use the built-in
 * banners shipped with the storefront", so the homepage never goes blank.
 */
export const DEFAULT_HERO_INTERVAL_SECONDS = 5

export async function getHeroSlides() {
  const doc = await getDb().collection(C.siteSettings).findOne({ _id: 'hero' })
  return {
    slides: doc?.slides || [],
    intervalSeconds: doc?.intervalSeconds || DEFAULT_HERO_INTERVAL_SECONDS,
    updated_at: doc?.updated_at || null,
  }
}

export async function saveHeroSlides(slides, intervalSeconds, actorId) {
  const now = new Date()
  await getDb()
    .collection(C.siteSettings)
    .updateOne({ _id: 'hero' }, { $set: { slides, intervalSeconds, updated_at: now, updated_by: actorId } }, { upsert: true })
  return { slides, intervalSeconds, updated_at: now }
}
