import { useQuery } from '@tanstack/react-query'
import { SelectField } from './FormField'
import { listContacts } from '../api/contacts'
import type { ContactType } from '../types/contact'

interface ContactSelectProps {
  label?: string
  value: number | null
  onChange: (contactId: number | null) => void
  type?: ContactType
  required?: boolean
}

export function ContactSelect({ label = 'Kontak', value, onChange, type, required }: ContactSelectProps) {
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
      <option value="">-- tidak ada --</option>
      {data?.data.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </SelectField>
  )
}
