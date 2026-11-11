import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CatalogPage } from '@/components/catalog/catalog-page'

const CATEGORY_VALUES = ['art', 'gaming', 'collectibles', 'music', 'photography', 'utility'] as const
const RARITY_VALUES = ['common', 'rare', 'epic', 'legendary'] as const
const CHAIN_VALUES = ['ethereum', 'polygon', 'solana'] as const
const SORT_VALUES = ['recent', 'price_asc', 'price_desc', 'popular', 'name'] as const

/**
 * Lista de valores na URL: aceita valor único ou repetido.
 * Saída opcional para que navegar para `/` sem search params continue válido
 * em todo o app (os padrões são aplicados no componente).
 */
function enumListSchema<TOutput extends string>(valueSchema: z.ZodType<TOutput>) {
  return z
    .union([valueSchema, z.array(valueSchema)])
    .transform((value): TOutput[] => (typeof value === 'string' ? [value] : value))
    .catch([])
    .optional()
}

const priceSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/)
  .optional()
  .catch(undefined)

const catalogSearchSchema = z.object({
  q: z.string().optional().catch(''),
  category: enumListSchema(z.enum(CATEGORY_VALUES)),
  rarity: enumListSchema(z.enum(RARITY_VALUES)),
  chain: enumListSchema(z.enum(CHAIN_VALUES)),
  sort: z.enum(SORT_VALUES).optional().catch('recent'),
  page: z.number().int().min(1).optional().catch(1),
  /** Faixa de preço em ETH (strings decimais, como em toda a API) */
  minPrice: priceSchema,
  maxPrice: priceSchema,
  /** Aba "Novos lançamentos": apenas itens em destaque */
  featured: z.boolean().optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: CatalogPage,
})
