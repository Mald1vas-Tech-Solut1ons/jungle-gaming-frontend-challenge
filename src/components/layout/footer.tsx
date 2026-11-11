import { useState, type ComponentType, type SVGProps } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { NftCategory } from '@/api/contracts'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from './brand-icons'

const INFO_COLUMNS = [
  {
    initial: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    initial: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    initial: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

type FooterLink = { label: string; to?: '/profile' | '/wallets'; category?: NftCategory }

const LINK_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/profile' },
      { label: 'Minha coleção' },
      { label: 'Atividade' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda' },
      { label: 'Como comprar NFTs' },
      { label: 'Carteira e segurança', to: '/wallets' },
      { label: 'Política do mercado' },
      { label: 'Denunciar item' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', category: 'art' },
      { label: 'Fotografia', category: 'photography' },
      { label: 'Música', category: 'music' },
      { label: 'Colecionáveis', category: 'collectibles' },
      { label: 'Utilidade', category: 'utility' },
    ],
  },
]

const SOCIALS: { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Twitter', Icon: TwitterIcon },
  { label: 'LinkedIn', Icon: LinkedinIcon },
  { label: 'YouTube', Icon: YoutubeIcon },
]

const linkClass = 'w-fit text-sm text-foreground transition-colors duration-200 hover:text-accent'

function outOfScope(label: string) {
  toast.info(`“${label}” fica fora do escopo desta entrega.`)
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.to) {
    return (
      <Link to={link.to} className={linkClass}>
        {link.label}
      </Link>
    )
  }
  if (link.category) {
    return (
      <Link to="/" search={{ category: [link.category] }} hash="catalogo" className={linkClass}>
        {link.label}
      </Link>
    )
  }
  return (
    <button type="button" className={`${linkClass} cursor-pointer text-left`} onClick={() => outOfScope(link.label)}>
      {link.label}
    </button>
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  return (
    <div className="md:border-l md:border-rule md:pl-4">
      <h3 className="text-base font-bold leading-none text-foreground">Antecipe-se ao próximo lançamento</h3>
      <form
        className="mt-4 flex h-10"
        onSubmit={(event) => {
          event.preventDefault()
          // Fora do escopo: nada é enviado — a UI não finge sucesso.
          toast.info('A newsletter é demonstrativa nesta entrega: nenhum e-mail foi cadastrado.')
        }}
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Seu e-mail para receber lançamentos
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="digite seu e-mail..."
          className="min-w-0 flex-1 rounded-l-sm border border-transparent bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors duration-200 placeholder:text-tan focus-visible:border-accent"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-r-sm bg-primary px-4 text-base font-bold text-primary-foreground transition-colors duration-200 hover:bg-accent"
        >
          Enviar
        </button>
      </form>
      <p className="mt-4 text-xs leading-[1.8] text-muted-foreground">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </div>
  )
}

/** Rodapé do layout (≥ 768px). No mobile a navegação fica na barra inferior. */
export function Footer() {
  return (
    <footer className="mt-24">
      <div className="page-container">
        <div className="bg-card">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.35fr] lg:gap-0 lg:px-8">
            {INFO_COLUMNS.map((column, index) => (
              <div key={column.title} className={index > 0 ? 'lg:border-l lg:border-rule lg:pl-4' : 'lg:pl-4'}>
                <span
                  aria-hidden="true"
                  className="flex size-[72px] items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
                >
                  {column.initial}
                </span>
                <h3 className="mt-4 text-base font-bold text-foreground">{column.title}</h3>
                <p className="mt-2 max-w-[13.5rem] text-sm leading-[1.6] text-muted-foreground">{column.text}</p>
              </div>
            ))}
            <Newsletter />
          </div>

          <div className="grid items-center gap-3 bg-surface-2 px-6 py-6 text-sm text-foreground md:grid-cols-4 lg:px-8">
            <span className="logo-kurio">Kurio</span>
            <span className="leading-[1.6]">Feito para colecionadores, criadores e cultura</span>
            <a href="mailto:contato@email.com" className="w-fit transition-colors duration-200 hover:text-accent">
              contato@email.com
            </a>
            <a href="tel:+551140028922" className="w-fit transition-colors duration-200 hover:text-accent">
              +55 11 4002 8922
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 px-6 py-8 md:grid-cols-4 lg:px-8">
            {LINK_COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2">
                <h3 className="mb-1 text-lg font-bold text-foreground">{column.title}</h3>
                {column.links.map((link) => (
                  <FooterLinkItem key={link.label} link={link} />
                ))}
              </nav>
            ))}
            <div>
              <h3 className="text-lg font-bold text-foreground">Redes sociais</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {SOCIALS.map(({ label, Icon }) => (
                  <li key={label}>
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => outOfScope(label)}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-primary text-accent transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground"
                    >
                      <Icon className="size-[18px]" />
                    </button>
                  </li>
                ))}
              </ul>
              <h3 className="mt-7 text-lg font-bold text-foreground">Carteiras compatíveis</h3>
              <p className="mt-3 w-fit rounded-md border border-rule bg-surface-2 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                MetaMask · WalletConnect · Coinbase
              </p>
            </div>
          </div>
        </div>
        <p className="py-6 text-center text-sm text-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
