import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { SelectField, TextField } from '../../components/FormField'
import { formatTimestamp } from '../../utils/date'
import { listActivityLogs } from '../../api/activityLogs'
import type { ActivityLog } from '../../types/activityLog'
import { useI18n } from '../../i18n/useI18n'

const ENTITY_TYPE_OPTIONS = [
  'warehouses',
  'items',
  'contacts',
  'inbounds',
  'outbounds',
  'stock-transfers',
  'stock-opnames',
  'sales',
  'purchases',
  'returns',
  'payments',
]

const ACTION_OPTIONS = ['create', 'update', 'delete', 'complete', 'approve', 'reject', 'cancel', 'submit']

export default function ActivityLogListPage() {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState('')
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['activity-logs', userId, warehouseId, entityType, entityId, action, from, to, page],
    queryFn: () =>
      listActivityLogs({
        user_id: userId ? Number(userId) : undefined,
        warehouse_id: warehouseId ?? undefined,
        entity_type: entityType || undefined,
        entity_id: entityId ? Number(entityId) : undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
      }),
  })

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const columns: DataTableColumn<ActivityLog>[] = [
    { key: 'created_at', header: t('Waktu'), render: (row) => formatTimestamp(row.created_at) },
    { key: 'user_id', header: t('User'), render: (row) => `User #${row.user_id}` },
    { key: 'action', header: t('Aksi'), render: (row) => row.action },
    { key: 'entity_type', header: t('Resource'), render: (row) => row.entity_type },
    { key: 'entity_id', header: t('ID'), className: 'text-right', render: (row) => row.entity_id },
    { key: 'method', header: t('Method'), render: (row) => row.method },
    { key: 'endpoint', header: t('Endpoint'), render: (row) => <span className="text-slate-500">{row.endpoint}</span> },
    {
      key: 'status_code',
      header: t('Status'),
      className: 'text-right',
      render: (row) => (
        <span className={row.status_code >= 400 ? 'font-medium text-red-600' : 'text-emerald-600'}>
          {row.status_code}
        </span>
      ),
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">{t('Activity Logs')}</h1>

      <FilterBar>
        <div className="w-32">
          <TextField label={t('User ID')} type="number" min={1} value={userId} onChange={(e) => resetPage(setUserId)(e.target.value)} />
        </div>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-44">
          <SelectField label={t('Resource')} value={entityType} onChange={(e) => resetPage(setEntityType)(e.target.value)}>
            <option value="">{t('Semua')}</option>
            {ENTITY_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-28">
          <TextField
            label={t('Entity ID')}
            type="number"
            min={1}
            value={entityId}
            onChange={(e) => resetPage(setEntityId)(e.target.value)}
          />
        </div>
        <div className="w-36">
          <SelectField label={t('Aksi')} value={action} onChange={(e) => resetPage(setAction)(e.target.value)}>
            <option value="">{t('Semua')}</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-40">
          <TextField label={t('Dari Tanggal')} type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label={t('Sampai Tanggal')} type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
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
              emptyMessage={t('Tidak ada activity log.')}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
