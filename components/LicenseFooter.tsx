// components/LicenseFooter.tsx
interface LicenseFooterProps {
  variant?: 'compact' | 'full'
  className?: string
}

export function LicenseFooter({ variant = 'compact', className = '' }: LicenseFooterProps) {
  if (variant === 'full') {
    return (
      <footer className={`text-center text-xs text-muted space-y-2 ${className}`}>
        <p>
          BinaryCash Trade is licensed and regulated in the Commonwealth of The Bahamas under
          licence number <span className="font-mono tracking-wide">BHA-0023-1873201</span>. The
          company has met all regulatory and compliance standards required to operate across all
          its services.
        </p>
        <p>© {new Date().getFullYear()} BinaryCash Trade. All rights reserved.</p>
      </footer>
    )
  }

  return (
    <p className={`text-center text-[11px] text-muted ${className}`}>
      Licensed in the Commonwealth of The Bahamas · Licence No{' '}
      <span className="font-mono tracking-wide">BHA-0023-1873201</span>
    </p>
  )
}