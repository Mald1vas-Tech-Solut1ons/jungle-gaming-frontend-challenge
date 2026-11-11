/**
 * Contratos REST e de eventos compartilhados entre o app e a camada MSW.
 * Valores monetários (ETH) trafegam SEMPRE como strings decimais.
 */

export type EthString = string

// ---------- Erros ----------
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'AVAILABILITY_CONFLICT'
  | 'QUOTE_CHANGED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'TRANSIENT_FAILURE'
  | 'INTERNAL_ERROR'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    /** Erros por campo: { email: 'Email já cadastrado' } */
    fields?: Record<string, string>
    details?: unknown
  }
}

// ---------- Usuário / sessão ----------
export interface User {
  id: string
  name: string
  email: string
  username: string
  bio: string
  avatarUrl: string | null
  createdAt: string
}

export interface Session {
  user: User
  token: string
  expiresAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface UpdateProfileRequest {
  name: string
  username: string
  email: string
  bio: string
  avatarUrl: string | null
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ---------- NFTs ----------
export type NftCategory = 'art' | 'gaming' | 'collectibles' | 'music' | 'photography' | 'utility'
export type NftRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type Chain = 'ethereum' | 'polygon' | 'solana'

export interface NftEdition {
  id: string
  name: string
  price: EthString
  /** Quantidade disponível. 0 = esgotada */
  available: number
  /** Limite por pedido */
  maxPerOrder: number
}

export interface NftReview {
  id: string
  author: string
  /** Nota de 1 a 5 */
  rating: number
  comment: string
  createdAt: string
}

export interface Nft {
  id: string
  name: string
  /** Identificador do token na coleção, ex.: '#0042' */
  tokenId: string
  collection: string
  creator: string
  description: string
  /** Traços exibidos em "Atributos" */
  attributes: string[]
  /** Endereço (fictício) do contrato inteligente */
  contractAddress: string
  /** Percentual de direitos autorais do criador nas vendas secundárias */
  royaltyPercent: number
  /** Média e total de avaliações de colecionadores */
  rating: { average: number; count: number }
  /** Avaliações mais recentes (amostra exibida no detalhe) */
  reviews: NftReview[]
  category: NftCategory
  rarity: NftRarity
  chain: Chain
  images: string[]
  /** Menor preço entre as edições disponíveis */
  price: EthString
  editions: NftEdition[]
  likes: number
  featured: boolean
  createdAt: string
  /** Versão monotônica, incrementada a cada alteração (usada na reconciliação de eventos) */
  version: number
}

export type NftSort = 'recent' | 'price_asc' | 'price_desc' | 'popular' | 'name'

export interface NftListParams {
  q?: string
  category?: NftCategory[]
  rarity?: NftRarity[]
  chain?: Chain[]
  minPrice?: string
  maxPrice?: string
  featured?: boolean
  sort?: NftSort
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * Contagens para a barra de filtros. Cada grupo é calculado sobre o resultado
 * com TODOS os outros filtros aplicados (busca incluída), menos o do próprio
 * grupo — assim o número ao lado de uma opção é o que ela traria se marcada.
 */
export interface NftFacets {
  category: Record<NftCategory, number>
  rarity: Record<NftRarity, number>
  chain: Record<Chain, number>
  /** Menor e maior preço do catálogo (limites do seletor de faixa) */
  price: { min: EthString; max: EthString }
}

export interface NftListResponse extends Paginated<Nft> {
  facets: NftFacets
}

// ---------- Favoritos ----------
export interface FavoritesResponse {
  nftIds: string[]
}

// ---------- Carrinho ----------
export interface CartItem {
  id: string
  nftId: string
  editionId: string
  quantity: number
  /** Snapshot denormalizado para exibição */
  nftName: string
  editionName: string
  image: string
  unitPrice: EthString
  available: number
  maxPerOrder: number
  nftVersion: number
}

export interface Cart {
  id: string
  items: CartItem[]
  couponCode: string | null
  updatedAt: string
}

export interface AddCartItemRequest {
  nftId: string
  editionId: string
  quantity: number
}

export interface MergeCartRequest {
  items: AddCartItemRequest[]
}

// ---------- Cotação ----------
export interface QuoteLine {
  nftId: string
  editionId: string
  name: string
  editionName: string
  image: string
  quantity: number
  unitPrice: EthString
  lineTotal: EthString
  available: number
}

export interface Quote {
  id: string
  lines: QuoteLine[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  coupon: { code: string; percentOff: number } | null
  network: Chain
  expiresAt: string
  /** Hash do conteúdo — muda quando preço/disponibilidade/cupom/taxa mudam */
  fingerprint: string
}

export interface QuoteRequest {
  couponCode?: string | null
  network?: Chain
}

// ---------- Carteiras ----------
export type WalletProvider = 'metamask' | 'coinbase' | 'walletconnect' | 'phantom'

export interface Wallet {
  id: string
  label: string
  provider: WalletProvider
  address: string
  network: Chain
  isPrimary: boolean
}

export interface UpsertWalletRequest {
  label: string
  provider: WalletProvider
  address: string
  network: Chain
  isPrimary: boolean
}

export interface WalletConnectResponse {
  walletId: string
  status: 'connected'
  sessionId: string
}

// ---------- Pedidos ----------
export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

/** Perfil do colecionador no pagamento (campos do frame "Pagamento"). */
export interface CollectorInfo {
  /** Nome de exibição */
  fullName: string
  /** Nome de usuário público (letras minúsculas, números, ponto e sublinhado) */
  username: string
  email: string
  /** Observação do colecionador (opcional) */
  note?: string
}

export interface CreateOrderRequest {
  quoteId: string
  quoteFingerprint: string
  walletId: string
  network: Chain
  collector: CollectorInfo
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  lines: QuoteLine[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  coupon: Quote['coupon']
  network: Chain
  wallet: Pick<Wallet, 'id' | 'label' | 'provider' | 'address'>
  collector: CollectorInfo
  txHash: string | null
  explorerUrl: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  version: number
}

// ---------- Eventos Socket.IO ----------
export interface SocketEventEnvelope<TType extends string, TPayload> {
  /** Identidade estável do evento (para deduplicação) */
  eventId: string
  type: TType
  /** Recurso afetado */
  resource: { kind: 'nft' | 'order'; id: string }
  /** Versão do recurso após o evento */
  version: number
  /** Dono do recurso, quando privado (pedidos) */
  userId?: string
  emittedAt: string
  payload: TPayload
}

export type NftUpdatedEvent = SocketEventEnvelope<
  'nft.updated',
  { nft: Pick<Nft, 'id' | 'price' | 'editions' | 'version'> }
>

export type OrderUpdatedEvent = SocketEventEnvelope<'order.updated', { order: Order }>

export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}

export interface ClientToServerEvents {
  'session.auth': (payload: { token: string | null }) => void
  'order.subscribe': (payload: { orderId: string }) => void
}

