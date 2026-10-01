export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type BackendResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};
