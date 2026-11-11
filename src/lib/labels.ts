import type { Chain, NftCategory, NftRarity, NftSort, WalletProvider } from '@/api/contracts'

/** Labels pt-BR centralizados (usados em filtros, badges e selects). */

export const CATEGORY_LABELS: Record<NftCategory, string> = {
  art: 'Arte digital',
  gaming: 'Jogos',
  collectibles: 'Colecionáveis',
  music: 'Música',
  photography: 'Fotografia',
  utility: 'Utilidade',
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
  solana: 'Solana',
}

export const SORT_LABELS: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  popular: 'Em alta',
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
