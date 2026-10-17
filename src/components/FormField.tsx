import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useI18n } from '../i18n/useI18n'

interface FieldWrapperProps {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
}

function FieldWrapper({ label, error, required, children }: FieldWrapperProps) {
  // Label/pesan bisa datang dari konstanta di tingkat modul, jadi diterjemahkan saat ditampilkan.
  const { t } = useI18n()
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {t(label)}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-xs text-red-600">{t(error)}</span>}
    </label>
  )
}

const inputClass =
  'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500'

type TextFieldProps = Omit<FieldWrapperProps, 'children'> & InputHTMLAttributes<HTMLInputElement>

export function TextField({ label, error, required, className, ...inputProps }: TextFieldProps) {
  return (
    <FieldWrapper label={label} error={error} required={required}>
      <input className={`${inputClass} ${className ?? ''}`} {...inputProps} />
    </FieldWrapper>
  )
}

type SelectFieldProps = Omit<FieldWrapperProps, 'children'> &
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }

export function SelectField({ label, error, required, className, children, ...selectProps }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error} required={required}>
      <select className={`${inputClass} ${className ?? ''}`} {...selectProps}>
        {children}
      </select>
    </FieldWrapper>
  )
}

type TextareaFieldProps = Omit<FieldWrapperProps, 'children'> & TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextareaField({ label, error, required, className, ...textareaProps }: TextareaFieldProps) {
  return (
    <FieldWrapper label={label} error={error} required={required}>
      <textarea className={`${inputClass} ${className ?? ''}`} rows={3} {...textareaProps} />
    </FieldWrapper>
  )
}
