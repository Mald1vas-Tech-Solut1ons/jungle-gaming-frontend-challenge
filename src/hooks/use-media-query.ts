import { useSyncExternalStore } from 'react'

/** Assina uma media query; usado para montar UMA variação de layout por vez. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Layout com sidebar lateral (≥ 1024px). */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')

/** Layout mobile do Figma (< 768px): barras próprias no lugar de header/footer. */
export const useIsMobile = () => useMediaQuery('(max-width: 767.98px)')
