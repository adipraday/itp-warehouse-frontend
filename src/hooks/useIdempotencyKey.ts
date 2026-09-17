import { useRef } from 'react'

/**
 * Kelola Idempotency-Key untuk aksi yang berdampak stok (complete/approve).
 * Key yang sama dipertahankan selama retry (mis. network error), lalu di-reset
 * setelah aksi sukses supaya aksi berikutnya generate key baru.
 */
export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null)

  function getKey(): string {
    if (!keyRef.current) {
      keyRef.current = crypto.randomUUID()
    }
    return keyRef.current
  }

  function reset(): void {
    keyRef.current = null
  }

  return { getKey, reset }
}
