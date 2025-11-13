export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  details?: Record<string, unknown>;
}

export const ApiSuccess = <T>(
  data: T,
  message = 'Request successful',
): ApiSuccessResponse<T> => ({
  success: true as const,
  message,
  data,
});

/**
 * Internal helper to build structured error response objects.
 * Note: Actual throwing is done by exception filters/guards.
 */
export const ApiError = (
  message: string,
  statusCode: number,
  details?: Record<string, unknown>,
): ApiErrorResponse => ({
  success: false as const,
  statusCode,
  message,
  ...(details ? { details } : {}),
});

/**
 * Short-hand for controllers:
 * return wrapData({ ... })
 * instead of returning raw data.
 *
 * TransformInterceptor will still wrap if you just return the data,
 * but this ensures explicit structure when needed.
 */
export const wrapData = <T>(
  data: T,
  message = 'Request successful',
): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data,
});
