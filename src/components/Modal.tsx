import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  // Portal ke `document.body` — bukan cuma kosmetik. `ItemPicker` (Fase 17) sekarang bisa muncul
  // di dalam `<form>` transaksi (Inbound/Sales/dst.), dan modal ini juga punya `<form>` sendiri di
  // dalamnya (mis. `ItemFormModal`). Tanpa portal, DOM-nya jadi `<form><form>...` yang tidak valid
  // di HTML — browser otomatis "membetulkan" nesting itu, bikin tombol submit modal nggak lagi
  // kepasang ke form yang benar. Portal keluarin modal dari subtree form manapun sepenuhnya.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <button
        className="absolute inset-0 cursor-default"
        aria-label="Tutup modal"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
        <div className={title ? 'mt-4' : ''}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
