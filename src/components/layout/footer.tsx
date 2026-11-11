import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'

const EDITORIAL_LINKS = [
  { label: 'Suporte', href: '/suporte' },
  { label: 'Atividade', href: '/atividade' },
  { label: 'Ofertas', href: '/ofertas' },
  { label: 'Downloads', href: '/downloads' },
]

const INFO_COLUMNS = [
  {
    title: 'Segurança da carteira',
    text: 'Suas chaves nunca saem do seu navegador. A simulação usa carteiras fictícias documentadas no README.',
  },
  {
    title: 'Criadores em destaque',
    text: 'Coleções curadas de arte, games e colecionáveis — cunhadas por criadores parceiros do marketplace.',
  },
  {
    title: 'Alertas de lançamentos',
    text: 'Receba avisos de drops e edições limitadas. Assine com seu melhor e-mail de colecionador.',
  },
]

const LINK_COLUMNS = [
  { title: 'Meu perfil', links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Lista de interesse'] },
  { title: 'Central de ajuda', links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado'] },
  { title: 'Coleções', links: ['Arte digital', 'Fotografia', 'Música', 'Colecionáveis'] },
]

export function Footer() {
  return (
    <footer className="mt-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 xl:px-0">
        <div className="rounded-xl bg-surface px-6 py-10 md:px-10">
          {/* Newsletter / destaque */}
          <div className="grid gap-6 md:grid-cols-3">
            {INFO_COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{col.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{col.text}</p>
              </div>
            ))}
          </div>

          {/* Colunas de links */}
          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            {LINK_COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
                {col.links.map((label) => (
                  <a
                    key={label}
                    href={`#${label.toLowerCase().replaceAll(' ', '-')}`}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault()
                      toast.info(`“${label}” é uma página editorial fora do escopo desta entrega.`)
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-foreground">Carteiras compatíveis</h4>
              <span className="text-xs text-muted-foreground">METAMASK · WALLETCONNECT · COINBASE</span>
              <nav aria-label="Links editoriais" className="mt-2 flex flex-col gap-2">
                {EDITORIAL_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault()
                      toast.info(`“${link.label}” é uma página editorial fora do escopo desta entrega.`)
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Faixa da marca */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-lg bg-surface-2 px-6 py-4 text-center md:flex-row md:text-left">
            <img src="/logo.svg" alt="Kurio" width={180} height={45} />
            <span className="text-xs text-muted-foreground">contato@kurio.market</span>
            <span className="text-xs text-muted-foreground">+55 11 4002 8922</span>
          </div>
        </div>
      </div>
      <Separator className="mt-8" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-1 px-4 py-4 text-xs text-muted-foreground md:flex-row md:justify-between">
        <span>© 2026 Kurio. Propriedade digital para todos.</span>
        <span>Valores em ETH são simulados.</span>
      </div>
    </footer>
  )
}
