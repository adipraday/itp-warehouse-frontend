export interface PaginationMeta {
  page: number
  per_page: number
  total: number
}

export interface ApiListResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiDetailResponse<T> {
  data: T
}

export interface ApiErrorBody {
  code: string
  message: string
  details: unknown[]
}
