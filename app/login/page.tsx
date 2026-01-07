'use client'

import { login } from '@/supabase/actions'
import { useActionState } from 'react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full sm:max-w-sm p-8 space-y-6 bg-zinc-900 sm:rounded-xl border border-zinc-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Bentornato!</h1>
          <p className="text-zinc-400 mt-2">Questa area è per pochi, ma se sei qui, sei tra loro.</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-zinc-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-zinc-500"
              placeholder="Enter your password"
            />
          </div>

          {state?.error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 px-4 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-zinc-400 text-xs text-center mt-2">Sei sicuro di avere l'accesso? Non si imbroglia!</p>
      </div>
    </div>
  )
}
