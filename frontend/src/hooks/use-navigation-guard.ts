import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Hook to guard against unsaved changes.
 * Handles both browser close/refresh (beforeunload) and internal Next.js route changes.
 * 
 * Note: Next.js 13+ App Router makes it hard to block internal navigation.
 * Standard practice is to intercept clicks on links or use an Overlay.
 */
export function useNavigationGuard(
  shouldGuard: boolean,
  onBlocked: () => void
) {
  const pathname = usePathname()

  // 1. Handle browser/tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldGuard) {
        e.preventDefault()
        e.returnValue = "" // Standard for modern browsers to show "Changes you made may not be saved"
        return ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [shouldGuard])

  // 2. Intercept internal navigation
  // Since Next.js doesn't have a built-in way to block `router.push` or `<Link>` easily anymore,
  // we use a global click listener to catch Link clicks.
  useEffect(() => {
    if (!shouldGuard) return

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest("a")

      if (anchor && anchor.href && anchor.target !== "_blank") {
        const url = new URL(anchor.href)
        if (url.origin === window.location.origin && url.pathname !== pathname) {
          e.preventDefault()
          e.stopPropagation()
          onBlocked()
        }
      }
    }

    // Attach to document to catch all link clicks
    document.addEventListener("click", handleAnchorClick, true)
    return () => document.removeEventListener("click", handleAnchorClick, true)
  }, [shouldGuard, pathname, onBlocked])
}
