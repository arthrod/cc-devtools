/**
 * Common API response types
 */

// @type-duplicate-allowed
export interface BaseResponse {
  success: boolean;
  error?: string;
}

export interface StoreResponse extends BaseResponse {
  id?: string;
  warning?: string;
}
