import { useContext } from 'react'
import { ToastContext } from '../components/toastContext'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast harus dipakai di dalam <ToastProvider>')
  }
  return ctx
}
