import type { Chain, NftCategory, NftRarity, NftSort, WalletProvider } from '@/api/contracts'

/** Labels pt-BR centralizados (usados em filtros, badges e selects). */

export const CATEGORY_LABELS: Record<NftCategory, string> = {
  art: 'Arte',
  gaming: 'Games',
  collectibles: 'Colecionáveis',
  music: 'Música',
  photography: 'Fotografia',
  sports: 'Esportes',
}

export const RARITY_LABELS: Record<NftRarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
}

export const CHAIN_LABELS: Record<Chain, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
}

export const SORT_LABELS: Record<NftSort, string> = {
  recent: 'Mais recentes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  popular: 'Mais populares',
  name: 'Nome (A–Z)',
}

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  coinbase: 'Coinbase',
  walletconnect: 'WalletConnect',
  phantom: 'Phantom',
}

/** Países (lista pequena e determinística para o formulário de pagamento). */
export const COUNTRIES = ['Brasil', 'Estados Unidos', 'Portugal', 'Argentina', 'México', 'Espanha', 'Alemanha', 'Japão'] as const
