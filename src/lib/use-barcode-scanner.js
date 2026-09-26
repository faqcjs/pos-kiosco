import { useEffect, useRef } from 'react'

/**
 * Custom hook to capture input from hardware barcode scanners (USB/Bluetooth HID).
 *
 * Scanners emit keystrokes rapidly (typically < 40-50ms between keys) ending with 'Enter'.
 *
 * @param {Object} options
 * @param {Function} options.onScan - Callback invoked when a barcode is scanned: (barcode: string) => void
 * @param {number} [options.minChars=3] - Minimum length of barcode
 * @param {number} [options.maxInterval=60] - Max milliseconds allowed between characters to consider it scanner input
 * @param {boolean} [options.enabled=true] - Whether scanner listener is active
 * @param {boolean} [options.preventDefault=true] - Prevent default Enter key behavior when scanner fires
 */
export function useBarcodeScanner({
  onScan,
  minChars = 3,
  maxInterval = 60,
  enabled = true,
  preventDefault = true,
}) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e) => {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const now = Date.now()
      const timeDiff = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        const buffer = bufferRef.current.trim()
        bufferRef.current = ''

        // Verify if buffer has enough chars and arrived fast enough
        if (buffer.length >= minChars) {
          if (preventDefault) {
            e.preventDefault()
            e.stopPropagation()
          }

          // If the active element was an input/textarea and the scanner typed into it,
          // clean the scanner characters out of the input
          const target = e.target
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            if (target.value && target.value.endsWith(buffer)) {
              const prefix = target.value.slice(0, -buffer.length)
              target.value = prefix
              target.dispatchEvent(new Event('input', { bubbles: true }))
            }
          }

          onScanRef.current?.(buffer)
        }
        return
      }

      // If only single character printable key
      if (e.key.length === 1) {
        if (timeDiff > maxInterval) {
          // Reset buffer if delay is too long (human typing)
          bufferRef.current = e.key
        } else {
          bufferRef.current += e.key
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true) // capture phase to intercept before inputs
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, minChars, maxInterval, preventDefault])
}
