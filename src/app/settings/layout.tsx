'use client'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 p-0 sm:p-4">
      {children}
    </div>
  )
} 