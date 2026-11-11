import type { Chain, Nft, NftCategory, NftRarity, WalletProvider } from '@/api/contracts'

/**
 * Fixtures determinísticas. Nada aqui usa Math.random/Date.now para que
 * cenários, testes e baselines visuais sejam reproduzíveis.
 */

export const FIXTURE_EPOCH = Date.UTC(2026, 9, 1, 12, 0, 0) // 2026-10-01T12:00:00Z

const IMAGE_COUNT = 12
export const nftImage = (n: number) => `/nfts/ape-${String(((n - 1) % IMAGE_COUNT) + 1).padStart(2, '0')}.webp`

const ADJECTIVES = ['Cosmic', 'Golden', 'Emerald', 'Neon', 'Ivory', 'Violet', 'Sage', 'Amber', 'Velvet', 'Lunar', 'Silent', 'Royal']
const NOUNS = ['Ape', 'Nomad', 'Vessel', 'Bloom', 'Baron', 'Beat']
const COLLECTIONS = ['Kurio Apes', 'Kurio Editions', 'Kurio Nomads', 'Kurio Signals']
const CREATORS = ['Nova Sato', 'Ilê Marques', 'Tomás Reis', 'Yara Fontes', 'Caio Brandt']
const ATTRIBUTE_POOL = ['Óculos', 'Esmeralda', 'Chapéu', 'Moletom', 'Fones', 'Blazer', 'Corrente', 'Brinco', 'Jaqueta', 'Gola alta']
const RARITY_ATTRIBUTE: Record<NftRarity, string> = { common: 'Comum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário' }
const REVIEWERS = ['marina.eth', 'otavio.kurio', 'lia.collects', 'dao.pedro', 'sofia.nft', 'rafa.vault']
const REVIEW_COMMENTS = [
  'Arte impecável e metadados completos. Chegou na carteira em segundos.',
  'A procedência registrada na rede dá muita segurança para colecionar.',
  'Edição muito bem acabada, o desbloqueável em alta resolução vale a pena.',
  'Comunidade ativa e criador presente. Já estou de olho no próximo lançamento.',
  'Processo de compra simples e a taxa de rede foi exatamente a cotada.',
  'Peça central da minha coleção. Os atributos raros fazem diferença.',
]
const CATEGORIES: NftCategory[] = ['art', 'gaming', 'collectibles', 'music', 'photography', 'utility']
const RARITIES: NftRarity[] = ['common', 'common', 'rare', 'rare', 'epic', 'legendary']
const CHAINS: Chain[] = ['ethereum', 'polygon', 'solana']

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

/** Endereço de contrato fictício e determinístico (0x + 40 hex). */
function contractFor(i: number): string {
  let hex = ''
  let x = (i * 2654435761) >>> 0
  while (hex.length < 40) {
    x = (Math.imul(x ^ (x >>> 13), 1274126177) + 0x9e3779b9) >>> 0
    hex += x.toString(16).padStart(8, '0')
  }
  return `0x${hex.slice(0, 40)}`
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
        name: '1/50',
        price: basePrice,
        available: i % 11 === 0 ? 0 : 3 + Math.floor(rand() * 20),
        maxPerOrder: 5,
      },
      {
        id: `${id}-gold`,
        name: '1/10',
        price: (Number(basePrice) * 2).toFixed(3),
        // Algumas edições douradas esgotadas para exercitar "edição indisponível"
        available: i % 4 === 0 ? 0 : 1 + Math.floor(rand() * 4),
        maxPerOrder: 2,
      },
      {
        id: `${id}-legend`,
        name: '1/1',
        price: (Number(basePrice) * 5).toFixed(3),
        available: i % 3 === 0 ? 1 : 0,
        maxPerOrder: 1,
      },
    ]
    const availablePrices = editions.filter((e) => e.available > 0).map((e) => e.price)
    // Metadados derivados do índice (sem consumir o PRNG): preços, estoque e
    // curtidas continuam determinísticos e independentes destes campos.
    const tokenNumber = String((i * 37) % 1000).padStart(4, '0')
    const ratingCount = 7 + ((i * 5) % 23)
    const ratingAverage = [4.8, 4.6, 5, 4.4, 4.9, 4.7][i % 6]
    const reviews = [0, 1, 2].map((k) => ({
      id: `${id}-review-${k + 1}`,
      author: REVIEWERS[(i + k * 2) % REVIEWERS.length],
      rating: k === 2 && ratingAverage < 4.7 ? 4 : 5,
      comment: REVIEW_COMMENTS[(i + k) % REVIEW_COMMENTS.length],
      createdAt: new Date(FIXTURE_EPOCH - (i + k * 3) * 43_200_000).toISOString(),
    }))
    nfts.push({
      id,
      name: `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[i % NOUNS.length]} #${tokenNumber.slice(1)}`,
      tokenId: `#${tokenNumber}`,
      collection: COLLECTIONS[i % COLLECTIONS.length],
      creator: CREATORS[i % CREATORS.length],
      description:
        'Um colecionável digital finalizado à mão, verificado na rede, com arte desbloqueável e acesso para colecionadores.',
      attributes: [
        ATTRIBUTE_POOL[i % ATTRIBUTE_POOL.length],
        ATTRIBUTE_POOL[(i * 3 + 1) % ATTRIBUTE_POOL.length],
        RARITY_ATTRIBUTE[rarity],
      ],
      contractAddress: contractFor(i),
      royaltyPercent: 5,
      rating: { average: ratingAverage, count: ratingCount },
      reviews,
      // Desalinha categoria e ciclo de imagens: cada coleção reúne artes variadas
      category: CATEGORIES[(i + Math.floor((i - 1) / IMAGE_COUNT)) % CATEGORIES.length],
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
  solana: '0.0008',
}

