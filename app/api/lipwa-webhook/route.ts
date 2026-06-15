import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role — NOT the cookie-based client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('🔔 Webhook body:', JSON.stringify(body, null, 2))

  const transactionId = body.api_ref
  const status = body.status

  if (status === 'payment.success') {
    const amount = body.amount

    await supabase
      .from('transactions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', transactionId)

    const { data: txn } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('id', transactionId)
      .single()

    if (txn) {
      await supabase.rpc('increment_balance', {
        user_id: txn.user_id,
        amount_to_add: amount,
      })

      await supabase.from('live_feed').insert({
        user_id: txn.user_id,
        event_type: 'deposit',
        description: `Deposited KES ${amount}`,
        amount,
      })
    }
  }

  if (status === 'payment.failed') {
    await supabase
      .from('transactions')
      .update({ status: 'failed' })
      .eq('id', transactionId)
  }

  return NextResponse.json({ received: true })
}