interface PageHeaderProps {
  title: string
  description?: string
}

/** Cabeçalho padrão das páginas de conta (título em fonte display + descrição). */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="display-title text-primary" style={{ fontSize: '1.1rem' }}>
        {title}
      </h1>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}
