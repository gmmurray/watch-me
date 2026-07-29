export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastState {
  message: string
  action?: ToastAction
}

export type ToastFn = (message: string, action?: ToastAction) => void
