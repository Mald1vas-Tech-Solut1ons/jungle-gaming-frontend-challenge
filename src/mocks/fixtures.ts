import type { Chain, Nft, NftCategory, NftRarity, WalletProvider } from '@/api/contracts'

/**
 * Fixtures determinísticas. Nada aqui usa Math.random/Date.now para que
 * cenários, testes e baselines visuais sejam reproduzíveis.
 */

export const FIXTURE_EPOCH = Date.UTC(2026, 9, 1, 12, 0, 0) // 2026-10-01T12:00:00Z

const IMAGE_COUNT = 12
export const nftImage = (n: number) => `/nfts/ape-${String(((n - 1) % IMAGE_COUNT) + 1).padStart(2, '0')}.webp`

const ADJECTIVES = ['Cosmic', 'Golden', 'Bored', 'Neon', 'Royal', 'Wild', 'Lazy', 'Cyber', 'Ancient', 'Lucky', 'Silent', 'Funky']
const NOUNS = ['Ape', 'Monke', 'Gorilla', 'Primate', 'Chimp', 'Kong']
const COLLECTIONS = ['Jungle Apes', 'Monkey Kingdom', 'Pixel Primates', 'Banana Club']
const CREATORS = ['@jungleart', '@pixelmonk', '@apestudio', '@bananadao', '@cryptokong']
const CATEGORIES: NftCategory[] = ['art', 'gaming', 'collectibles', 'music', 'photography', 'sports']
const RARITIES: NftRarity[] = ['common', 'common', 'rare', 'rare', 'epic', 'legendary']
const CHAINS: Chain[] = ['ethereum', 'polygon', 'arbitrum']

/** PRNG determinístico (mulberry32) */
function prng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function priceFor(rand: () => number, rarity: NftRarity): string {
  const base = { common: 0.05, rare: 0.4, epic: 1.2, legendary: 3.5 }[rarity]
  // 3 casas decimais, gerado como inteiro de milésimos para evitar float drift
  const milli = Math.round((base + rand() * base) * 1000)
  return (milli / 1000).toFixed(3)
}

export const NFT_COUNT = 36

export function buildNfts(): Nft[] {
  const rand = prng(42)
  const nfts: Nft[] = []
  for (let i = 1; i <= NFT_COUNT; i++) {
    const rarity = RARITIES[Math.floor(rand() * RARITIES.length)]
    const basePrice = priceFor(rand, rarity)
    const n = i
    const id = `nft-${String(i).padStart(3, '0')}`
    const editions = [
      {
        id: `${id}-std`,
        name: 'Standard',
        price: basePrice,
        available: i % 11 === 0 ? 0 : 3 + Math.floor(rand() * 20),
        maxPerOrder: 5,
      },
      {
        id: `${id}-gold`,
        name: 'Gold',
        price: (Number(basePrice) * 2).toFixed(3),
        // Algumas edições douradas esgotadas para exercitar "edição indisponível"
        available: i % 4 === 0 ? 0 : 1 + Math.floor(rand() * 4),
        maxPerOrder: 2,
      },
      {
        id: `${id}-legend`,
        name: 'Legendary',
        price: (Number(basePrice) * 5).toFixed(3),
        available: i % 3 === 0 ? 1 : 0,
        maxPerOrder: 1,
      },
    ]
    const availablePrices = editions.filter((e) => e.available > 0).map((e) => e.price)
    nfts.push({
      id,
      name: `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[i % NOUNS.length]} #${1000 + i * 7}`,
      collection: COLLECTIONS[i % COLLECTIONS.length],
      creator: CREATORS[i % CREATORS.length],
      description:
        'Uma peça única da coleção, criada à mão e cunhada on-chain. Cada edição concede acesso exclusivo à comunidade e a drops futuros.',
      category: CATEGORIES[i % CATEGORIES.length],
      rarity,
      chain: CHAINS[i % CHAINS.length],
      images: [nftImage(n), nftImage(n + 3), nftImage(n + 6), nftImage(n + 9)],
      price: availablePrices.sort((a, b) => Number(a) - Number(b))[0] ?? basePrice,
      editions,
      likes: Math.floor(rand() * 500),
      featured: i <= 4,
      createdAt: new Date(FIXTURE_EPOCH - i * 86_400_000).toISOString(),
      version: 1,
    })
  }
  return nfts
}

export interface FixtureUser {
  id: string
  name: string
  email: string
  username: string
  password: string
  bio: string
}

/** Credenciais fictícias documentadas no README. */
export const FIXTURE_USERS: FixtureUser[] = [
  {
    id: 'user-ana',
    name: 'Ana Colecionadora',
    email: 'ana@jungle.test',
    username: 'ana.nft',
    password: 'Senha@123',
    bio: 'Colecionadora de arte digital desde 2021.',
  },
  {
    id: 'user-bruno',
    name: 'Bruno Trader',
    email: 'bruno@jungle.test',
    username: 'bruno.eth',
    password: 'Senha@123',
    bio: 'Trader e entusiasta de gaming NFTs.',
  },
]

export const FIXTURE_WALLETS: Record<
  string,
  { id: string; label: string; provider: WalletProvider; address: string; network: Chain; isPrimary: boolean }[]
> = {
  'user-ana': [
    {
      id: 'wallet-ana-1',
      label: 'MetaMask principal',
      provider: 'metamask',
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      network: 'ethereum',
      isPrimary: true,
    },
  ],
  'user-bruno': [],
}

export interface Coupon {
  code: string
  percentOff: number
  expiresAt: string
}

export const COUPONS: Coupon[] = [
  { code: 'JUNGLE10', percentOff: 10, expiresAt: '2099-01-01T00:00:00.000Z' },
  { code: 'APE25', percentOff: 25, expiresAt: '2099-01-01T00:00:00.000Z' },
  { code: 'EXPIRED5', percentOff: 5, expiresAt: '2020-01-01T00:00:00.000Z' },
]

/** Taxa de rede fixa por chain (string decimal) */
export const NETWORK_FEES: Record<Chain, string> = {
  ethereum: '0.0042',
  polygon: '0.0003',
  arbitrum: '0.0008',
}

