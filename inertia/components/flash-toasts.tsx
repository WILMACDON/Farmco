'use client'

import { usePage } from '@inertiajs/react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

type FlashBag = {
  error?: string | { message?: string }
  success?: string | { message?: string; token?: string }
}

/**
 * Surfaces server flash messages (e.g. forbidden redirect) as toasts once per payload.
 */
export function FlashToasts() {
  const { flash } = usePage().props as { flash?: FlashBag }
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (!flash) return

    const errorMessage =
      typeof flash.error === 'string' ? flash.error : flash.error?.message || null
    const successMessage =
      typeof flash.success === 'string' ? flash.success : flash.success?.message || null

    if (!errorMessage && !successMessage) return

    const key = JSON.stringify({ errorMessage, successMessage })
    if (key === lastKey.current) return
    lastKey.current = key

    if (errorMessage) toast.error(errorMessage)
    if (successMessage) toast.success(successMessage)
  }, [flash])

  return null
}
