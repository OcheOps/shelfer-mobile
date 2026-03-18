export interface ApiSuccess<T> {
  data: T;
  request_id?: string;
}

export interface ApiError {
  error: { code: string; message: string };
  request_id?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; per_page: number; total_count: number; total_pages: number };
}
