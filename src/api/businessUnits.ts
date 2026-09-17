import { authGet } from '../auth/authClient'
import type { BusinessUnit } from '../types/user'

export function getBusinessUnit(id: number) {
  return authGet<BusinessUnit>(`/business-units/${id}`)
}
