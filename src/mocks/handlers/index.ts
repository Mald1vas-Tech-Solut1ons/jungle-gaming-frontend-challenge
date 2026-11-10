import { accountHandlers } from './account'
import { catalogHandlers } from './catalog'
import { commerceHandlers } from './commerce'
import { controlHandlers } from './control'

/** Todos os handlers REST da simulação. */
export const handlers = [...catalogHandlers, ...commerceHandlers, ...accountHandlers, ...controlHandlers]
