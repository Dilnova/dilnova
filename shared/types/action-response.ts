/**
 * Standard Server Action response contracts.
 */
export interface ActionSuccess<T = void> {
  success: true;
  data?: T;
  error?: null;
}

export interface ActionFailure {
  success: false;
  error: string;
  data?: null;
}

export type ActionResponse<T = void> = ActionSuccess<T> | ActionFailure;

/**
 * Creates a standard successful ActionResponse.
 */
export function actionSuccess<T = void>(data?: T): ActionSuccess<T> {
  return { success: true, data, error: null };
}

/**
 * Creates a standard failed ActionResponse.
 */
export function actionFailure(error: string): ActionFailure {
  return { success: false, error, data: null };
}
