# BinaryCash 254 - Binary Trading Platform

A full-stack binary options trading platform built with Next.js, Supabase, and Tailwind CSS. Designed for Kenyan users with M-Pesa integration.

## Features

- **Binary Trading**: Trade with Buy/Sell options on oscillating price charts
- **Real & Demo Accounts**: Test with demo (200 KES auto-credit) or trade with real money
- **M-Pesa Integration**: Deposit and withdraw funds via M-Pesa
- **Live Activity Feed**: Real-time transaction updates
- **Transaction History**: Track all deposits, withdrawals, and trades
- **User Profile Management**: Update account details and password
- **Responsive Design**: Mobile-first design with bottom navigation, desktop sidebar
- **Dark Theme**: Optimized for 24/7 trading interface

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **UI**: Tailwind CSS v4
- **Charts**: Recharts
- **Styling**: Custom dark theme with CSS variables

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
app/
├── page.tsx                 # Auth redirect router
├── layout.tsx               # Root layout with fonts
├── globals.css              # Dark theme + Tailwind config
├── auth/
│   ├── login/page.tsx       # Login page
│   ├── sign-up/page.tsx     # Signup page
│   └── callback/route.ts    # Supabase auth callback
├── dashboard/page.tsx       # Main trading interface
├── profile/page.tsx         # User profile & settings
├── history/page.tsx         # Transaction history
├── deposit/page.tsx         # Deposit via M-Pesa
└── withdraw/page.tsx        # Withdrawal via M-Pesa

components/
├── TradingChart.tsx         # Price chart visualization
├── TradingControls.tsx      # Buy/Sell controls
├── ActivityFeed.tsx         # Live activity stream

lib/
├── supabase/
│   ├── client.ts            # Client-side Supabase
│   ├── server.ts            # Server-side Supabase
│   └── proxy.ts             # Session management
├── store.ts                 # Zustand state management
├── schemas.ts               # Zod validation schemas
├── api.ts                   # API utilities
├── trading.ts               # Trading logic helpers
└── utils.ts                 # Formatting & utilities
```

## Key Pages

### Trade (Dashboard)
- Live price chart with Buy/Sell buttons
- Configurable stake amounts (50, 100, 200, 500 KES + custom)
- Auto-sell timer (30s, 1m, 2m, 5m)
- Real-time P&L display
- Live activity feed (desktop only)

### Deposit
- M-Pesa payment integration
- Quick amount selection ($5, $10, $15, $20, $100)
- Phone number pre-filled

### Withdraw
- Withdrawal request submission
- M-Pesa payout to registered number
- Withdrawal history tracking

### Profile
- Account details management
- Password change
- Trading statistics (balance, deposits, trades, win rate)

### History
- Transaction filtering by type and date
- Trade results tracking
- Withdrawal/deposit status

## Database Schema

### profiles
- User account information
- Balance tracking (real & demo)
- Account type and statistics

### trades
- Trading history with entry/exit prices
- Win/loss results and P&L
- Timestamp tracking

### transactions
- Deposits and withdrawals
- Transaction status (pending/completed/failed)
- Amount and method tracking

### live_feed
- Activity stream for real-time updates
- User messages and system events

## Authentication Flow

1. User signs up with email/password
2. Supabase creates user and triggers auto-profile creation
3. Profile initialized with:
   - Demo account: 200 KES balance
   - Account type: 'demo' (can be switched to 'real')
4. User can login and start trading

## Trading Logic

- **Chart Data**: Simulated oscillating prices using random walk algorithm
- **Trade Resolution**: Trades auto-resolve after selected time interval
- **Win Calculation**: Entry price vs exit price determines win/loss
- **P&L**: Calculated using 1.85x multiplier on stake
- **Balance Update**: Automatic upon trade resolution

## Environment Variables

Required for production deployment:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Deployment

Deploy to Vercel with the Supabase integration configured:

1. Connect your GitHub repository
2. Add Supabase integration in Vercel project settings
3. Environment variables are automatically injected
4. Deploy!

## Development Tips

- Use the store (`lib/store.ts`) for global state
- Validation schemas are in `lib/schemas.ts`
- Utility functions for formatting in `lib/utils.ts`
- Dark theme tokens in `app/globals.css`

## License

Licensed in the Commonwealth of The Bahamas under licence number BHA-0023-1873201

## Support

For issues or questions, please contact support or check the documentation.
