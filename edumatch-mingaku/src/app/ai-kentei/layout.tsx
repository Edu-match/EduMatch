export default function AiKenteiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="ai-kentei-theme min-h-full bg-background text-foreground">
      {children}
    </div>
  )
}
