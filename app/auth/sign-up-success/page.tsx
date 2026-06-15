'use client'

import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Account Created!</h1>
          <p className="text-text-muted mt-2">Your account is ready to trade.</p>
        </div>

        <div className="bg-surface p-4 rounded border border-border mb-6">
          <p className="text-sm text-text-muted">
            You&apos;ve been credited with <span className="text-success font-semibold">200 KES</span> in demo funds to start trading.
          </p>
        </div>

        <Link
          href="/auth/login"
          className="inline-block px-6 py-2 bg-primary text-background font-semibold rounded hover:bg-primary-hover"
        >
          Continue to Login
        </Link>
      </div>
    </div>
  )
}
