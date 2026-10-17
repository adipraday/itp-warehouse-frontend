import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { SelectField, TextField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { createContact, updateContact } from '../../api/contacts'
import type { Contact, ContactInput, ContactType } from '../../types/contact'
import { useI18n } from '../../i18n/useI18n'

interface ContactFormModalProps {
  open: boolean
  onClose: () => void
  contact?: Contact | null
}

const EMPTY_FORM: ContactInput = { type: 'customer', name: '', phone: '', email: '', address: '' }

export function ContactFormModal({ open, onClose, contact }: ContactFormModalProps) {
  const { t } = useI18n()
  const [form, setForm] = useState<ContactInput>(EMPTY_FORM)
  const queryClient = useQueryClient()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setForm(
        contact
          ? {
              type: contact.type,
              name: contact.name,
              phone: contact.phone ?? '',
              email: contact.email ?? '',
              address: contact.address ?? '',
            }
          : EMPTY_FORM,
      )
    }
  }, [open, contact])

  const mutation = useMutation({
    mutationFn: (input: ContactInput) => (contact ? updateContact(contact.id, input) : createContact(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.show(contact ? t('Kontak berhasil diupdate.') : t('Kontak berhasil dibuat.'), 'success')
      onClose()
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({
      type: form.type,
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      address: form.address?.trim() || null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={contact ? t('Edit Kontak') : t('Tambah Kontak')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label={t('Tipe')}
          required
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContactType }))}
        >
          <option value="customer">{t('Customer')}</option>
          <option value="supplier">{t('Supplier')}</option>
          <option value="both">{t('Keduanya')}</option>
        </SelectField>
        <TextField
          label={t('Nama')}
          required
          maxLength={150}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={t('Budi Santoso')}
        />
        <TextField
          label={t('Telepon')}
          value={form.phone ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="08123456789"
        />
        <TextField
          label={t('Email')}
          type="email"
          value={form.email ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <TextField
          label={t('Alamat')}
          value={form.address ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('Batal')}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? t('Menyimpan...') : t('Simpan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
