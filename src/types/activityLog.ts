export interface ActivityLog {
  id: number
  user_id: number
  warehouse_id: number | null
  action: string
  entity_type: string
  entity_id: number
  method: string
  endpoint: string
  status_code: number
  metadata: Record<string, unknown>
  created_at: string
}
