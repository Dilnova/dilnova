/**
 * Standard Server Action response contracts.
 */
export interface ActionSuccess<T = void> {
  success: true;
  data?: T;
}

export interface ActionFailure {
  success: false;
  error: string;
}

export type ActionResponse<T = void> = ActionSuccess<T> | ActionFailure;
