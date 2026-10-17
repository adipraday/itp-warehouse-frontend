import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { SelectField } from '../../components/FormField'
import { listContacts } from '../../api/contacts'
import type { Contact, ContactType } from '../../types/contact'
import { ContactFormModal } from './ContactFormModal'
import { usePermissions } from '../../auth/permissions'
import { BuLabel } from '../../components/BuLabel'
import { hasMultipleBuIds } from '../../utils/bu'
import { useI18n } from '../../i18n/useI18n'
import { tk } from '../../i18n/i18n'

const TYPE_LABEL: Record<ContactType, string> = {
  customer: tk('Customer'),
  supplier: tk('Supplier'),
  both: tk('Keduanya'),
}

export default function ContactListPage() {
  const { t } = useI18n()
  const { canWrite } = usePermissions()
  const canManage = canWrite('contacts')
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<ContactType | ''>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['contacts', typeFilter, page],
    queryFn: () => listContacts({ type: typeFilter || undefined, page }),
  })

  // Contacts sekarang di-scope per BU juga (§15 frontend-integration-guide.md) — kolom "BU" cuma
  // tampil kalau datanya beneran lintas >1 BU, sama pola kayak WarehouseListPage (§14).
  const showBuColumn = hasMultipleBuIds(data?.data ?? [])

  const columns: DataTableColumn<Contact>[] = [
    { key: 'name', header: t('Nama'), render: (row) => row.name },
    { key: 'type', header: t('Tipe'), render: (row) => t(TYPE_LABEL[row.type]) },
    { key: 'phone', header: t('Telepon'), render: (row) => row.phone ?? '-' },
    { key: 'email', header: t('Email'), render: (row) => row.email ?? '-' },
    ...(showBuColumn
      ? ([{ key: 'bu', header: t('BU'), render: (row: Contact) => <BuLabel buId={row.bu_id} /> }] as DataTableColumn<Contact>[])
      : []),
    ...(canManage
      ? ([
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (row: Contact) => (
              <button
                type="button"
                onClick={() => {
                  setEditing(row)
                  setFormOpen(true)
                }}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {t('Edit')}
              </button>
            ),
          },
        ] as DataTableColumn<Contact>[])
      : []),
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t('Contacts')}</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('+ Tambah Kontak')}
          </button>
        )}
      </div>

      <FilterBar>
        <div className="w-48">
          <SelectField
            label={t('Tipe')}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ContactType | '')
              setPage(1)
            }}
          >
            <option value="">{t('Semua')}</option>
            <option value="customer">{t('Customer')}</option>
            <option value="supplier">{t('Supplier')}</option>
            <option value="both">{t('Keduanya')}</option>
          </SelectField>
        </div>
      </FilterBar>

      <div className="mt-4">
        {isError ? (
          <ErrorState error={error} />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              getRowKey={(row) => row.id}
              loading={isLoading}
              emptyMessage={t('Belum ada kontak.')}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>

      <ContactFormModal open={formOpen} onClose={() => setFormOpen(false)} contact={editing} />
    </div>
  )
}
