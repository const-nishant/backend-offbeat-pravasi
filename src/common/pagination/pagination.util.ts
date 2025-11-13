export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Safe pagination utility.
 * Ensures valid numbers and enforces sensible defaults.
 */
export const getPagination = (
  params: PaginationParams,
  defaultLimit = 20,
  maxLimit = 100,
): PaginationResult => {
  const rawPage = params.page;
  const rawLimit = params.limit;

  // page must be >= 1
  const page = rawPage && rawPage > 0 ? rawPage : 1;

  // limit must be >= 1 and capped to maxLimit
  const limit =
    rawLimit && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;

  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
};

/**
 * Build pagination metadata for response.
 */
export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
