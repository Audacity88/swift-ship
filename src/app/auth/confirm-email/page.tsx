import Link from 'next/link'

export default function ConfirmEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p>If email confirmation is enabled, follow the link in your confirmation email, then sign in. Local Supabase disables confirmation by default, so you can sign in immediately.</p>
      <Link href="/auth/signin" className="text-primary underline">Continue to sign in</Link>
    </main>
  )
}
