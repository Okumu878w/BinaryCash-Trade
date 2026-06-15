import { createClient } from '@/lib/supabase/client'
import { calculateProfitLoss } from '@/lib/trading'

const supabase = createClient()

// ──────────────────────────────────────────────
// CREATE TRADE
// ──────────────────────────────────────────────
export async function createTrade(
  userId: string,
  symbol: string,
  direction: 'buy' | 'sell',
  stake: number,
  entryPrice: number,
  accountType: 'demo' | 'real',
  expiresAt: Date
) {
  const { data, error } = await supabase
    .from('trades')
    .insert({
      user_id: userId,
      pair: symbol,
      direction,
      stake,
      entry_price: entryPrice,
      account_type: accountType,
      expires_at: expiresAt.toISOString(),
      result: 'pending',
    })
    .select()

  if (error) {
    console.error('createTrade error:', error)
    throw error
  }

  return data
}

// ──────────────────────────────────────────────
// CLOSE TRADE
// ──────────────────────────────────────────────
export async function closeTrade(
  tradeId: string,
  exitPrice: number,
  result: 'win' | 'loss'
) {
  // Fetch the trade to compute P&L and know which balance to update
  const { data: trade, error: fetchError } = await supabase
    .from('trades')
    .select('entry_price, direction, stake, account_type, user_id')
    .eq('id', tradeId)
    .single()

  if (fetchError) {
    console.error('closeTrade fetch error:', fetchError)
    throw fetchError
  }

  const pnl = calculateProfitLoss(
    trade.entry_price,
    exitPrice,
    trade.direction,
    trade.stake
  )

  // Update the trade record
  const { data, error: updateError } = await supabase
    .from('trades')
    .update({
      exit_price: exitPrice,
      profit_loss: pnl,
      result,
      closed_at: new Date().toISOString(),
    })
    .eq('id', tradeId)
    .select()

  if (updateError) {
    console.error('closeTrade update error:', updateError)
    throw updateError
  }

  // Update the user's balance (demo or real) based on pnl
  const balanceColumn = trade.account_type === 'demo' ? 'demo_balance' : 'real_balance'

  console.log('closeTrade: balanceColumn =', balanceColumn, 'pnl =', pnl, 'user_id =', trade.user_id)

  const { data: profile, error: profileFetchError } = await supabase
    .from('profiles')
    .select(balanceColumn)
    .eq('id', trade.user_id)
    .single()

  console.log('closeTrade: profile =', profile, 'profileFetchError =', profileFetchError)

  if (!profileFetchError && profile) {
    const currentBalance = (profile as Record<string, number>)[balanceColumn] ?? 0
    const newBalance = currentBalance + pnl

    console.log('closeTrade: currentBalance =', currentBalance, 'newBalance =', newBalance)

    const { data: updateData, error: balanceError } = await supabase
      .from('profiles')
      .update({ [balanceColumn]: newBalance })
      .eq('id', trade.user_id)
      .select()

    console.log('closeTrade: balance update result =', updateData, 'error =', balanceError)

    if (balanceError) {
      console.error('closeTrade balance update error:', balanceError)
    }
  }

  // Insert into live feed
  const { error: feedError } = await supabase
    .from('live_feed')
    .insert({
      user_id: trade.user_id,
      event_type: 'trade',
      description: `${trade.direction.toUpperCase()} trade ${result === 'win' ? 'won' : 'lost'}`,
      amount: pnl,
    })

  if (feedError) {
    console.error('closeTrade live_feed insert error:', feedError)
  }

  return data
}