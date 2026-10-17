import { useQuery } from '@tanstack/react-query'
import { SelectField } from './FormField'
import { listContacts } from '../api/contacts'
import type { ContactType } from '../types/contact'
import { useI18n } from '../i18n/useI18n'
import { translate } from '../i18n/i18n'

interface ContactSelectProps {
  label?: string
  value: number | null
  onChange: (contactId: number | null) => void
  type?: ContactType
  required?: boolean
}

export function ContactSelect({ label = translate('Kontak'), value, onChange, type, required }: ContactSelectProps) {
  const { t } = useI18n()
  const { data } = useQuery({
    queryKey: ['contacts', 'all', type],
    queryFn: () => listContacts({ type, page: 1, per_page: 100 }),
  })

  return (
    <SelectField
      label={label}
      required={required}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{t('-- tidak ada --')}</option>
      {data?.data.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </SelectField>
  )
}
