import { useEffect } from 'react'
import { toast } from 'sonner'
import { onRealtimeFeedback } from '@/lib/socket'

/**
 * Feedback acessível para mudanças em tempo real: transforma eventos
 * `nft.updated`/`order.updated` em toasts (sonner já anuncia via live region).
 */
export function RealtimeToasts() {
  useEffect(() => {
    return onRealtimeFeedback((feedback) => {
      if (feedback.kind === 'order') {
        const status = feedback.event.type === 'order.updated' ? feedback.event.payload.order.status : null
        if (status === 'confirmed') toast.success(feedback.message)
        else if (status === 'rejected') toast.error(feedback.message)
        else toast.info(feedback.message)
      } else {
        toast.info(feedback.message)
      }
    })
  }, [])
  return null
}
