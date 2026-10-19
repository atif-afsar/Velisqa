/** Fired by the mobile tab bar; the header opens the search dialog. */
export const OPEN_SEARCH_EVENT = 'velisqa:open-search'

/** Routes with their own sticky bottom action (or focused flows) don't show the tab bar. */
const TABBAR_HIDDEN = [/^\/admin/, /^\/checkout/, /^\/pay\//, /^\/product\//, /^\/cart$/, /^\/order-confirmation\//]

export function isTabBarHidden(pathname) {
  return TABBAR_HIDDEN.some((re) => re.test(pathname))
}
