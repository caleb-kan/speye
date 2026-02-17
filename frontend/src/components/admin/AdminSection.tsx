interface AdminSectionProps {
  title: string
  className?: string
  children: React.ReactNode
}

export function AdminSection({
  title,
  className = '',
  children,
}: AdminSectionProps) {
  return (
    <section className={`border border-border rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-text mb-4 shrink-0">{title}</h2>
      {children}
    </section>
  )
}
