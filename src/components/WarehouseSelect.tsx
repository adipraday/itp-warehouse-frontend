import { useQuery } from '@tanstack/react-query'
import { SelectField } from './FormField'
import { listWarehouses } from '../api/warehouses'
import { translate } from '../i18n/i18n'

interface WarehouseSelectProps {
  label?: string
  value: number | null
  onChange: (warehouseId: number | null) => void
  required?: boolean
  placeholder?: string
  // 'bu' = semua warehouse di BU caller (bukan cuma yang di-assign) — khusus tujuan stock transfer.
  scope?: 'assigned' | 'bu'
}

export function WarehouseSelect({
  label = translate('Warehouse'),
  value,
  onChange,
  required,
  placeholder = translate('Semua warehouse'),
  scope = 'assigned',
}: WarehouseSelectProps) {
  const { data } = useQuery({
    queryKey: ['warehouses', 'all', scope],
    queryFn: () => listWarehouses({ page: 1, per_page: 100, scope }),
  })

  return (
    <SelectField
      label={label}
      required={required}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{placeholder}</option>
      {data?.data.map((w) => (
        <option key={w.id} value={w.id}>
          {w.code} — {w.name}
        </option>
      ))}
    </SelectField>
  )
}
