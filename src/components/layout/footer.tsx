import { Leaf } from 'lucide-react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'

const EDITORIAL_LINKS = [
  { label: 'Suporte', href: '/suporte' },
  { label: 'Atividade', href: '/atividade' },
  { label: 'Ofertas', href: '/ofertas' },
  { label: 'Downloads', href: '/downloads' },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Leaf className="size-5 text-primary" aria-hidden="true" />
            <span className="display-title">Jungle.</span>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Marketplace de NFTs de demonstração — APIs, autenticação, carteiras e pagamentos são simulados com MSW.
          </p>
        </div>
        <nav aria-label="Links editoriais" className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {EDITORIAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
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
      <Separator />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground md:flex-row md:justify-between">
        <span>© 2026 Jungle Marketplace — demonstração técnica (teste frontend).</span>
        <span>Valores em ETH são simulados.</span>
      </div>
    </footer>
  )
}
