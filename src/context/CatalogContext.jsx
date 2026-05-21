import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [catalogVersion, setCatalogVersion] = useState(0)

  const notifyCatalogChange = useCallback(() => {
    setCatalogVersion((v) => v + 1)
  }, [])

  const value = useMemo(
    () => ({ catalogVersion, notifyCatalogChange }),
    [catalogVersion, notifyCatalogChange],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) {
    throw new Error('useCatalog must be used within CatalogProvider')
  }
  return ctx
}
