type AuthShellProps = {
  actionHref?: string
  actionLabel?: string
  children: React.ReactNode
  description?: string
  eyebrow?: string
  title?: string
}

function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="w-full max-w-md">
      <section className="flex min-w-0 justify-center">{children}</section>
    </div>
  )
}

export { AuthShell }
