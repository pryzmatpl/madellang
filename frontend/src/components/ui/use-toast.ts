import { useEffect, useState } from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = {
  id: string
  title?: string
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Toast = Omit<ToasterToast, "id">

type ToastActionType = {
  toast: (props: Toast) => void
  dismiss: (toastId?: string) => void
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }
    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        toastTimeouts.set(
          toastId,
          setTimeout(() => {
            toastTimeouts.delete(toastId)
          }, TOAST_REMOVE_DELAY)
        )
      } else {
        state.toasts.forEach((toast) => {
          toastTimeouts.set(
            toast.id,
            setTimeout(() => {
              toastTimeouts.delete(toast.id)
            }, TOAST_REMOVE_DELAY)
          )
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

type ToastProps = {
  title?: string
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

export function useToast() {
  const [state, setState] = useState<State>({ toasts: [] })

  const toast = (props: ToastProps) => {
    console.log("Toast:", props)
    // In a real implementation, this would show a toast notification
  }

  const dismiss = (toastId?: string) => {
    setState((prev) => reducer(prev, {
      type: "DISMISS_TOAST",
      toastId,
    }))
  }

  const update = (id: string, props: Toast) => {
    setState((prev) => reducer(prev, {
      type: "UPDATE_TOAST",
      toast: {
        ...props,
        id,
      },
    }))
  }

  return {
    toasts: state.toasts,
    toast,
    dismiss,
    update,
  }
}
