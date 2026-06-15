import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { amount, phone, userId } = await req.json()

  const supabase =await createClient()

  // 1. Insert pending transaction
  const { data: txn, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'deposit',
      amount,
      currency: 'KES',
      method: 'm-pesa',
      phone,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 2. Trigger Lipwa STK Push
  const lipwaRes = await fetch('https://pay.lipwa.app/api/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LIPWA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      phone_number: phone,
      channel_id: process.env.LIPWA_CHANNEL_ID,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/lipwa-webhook`,
      api_ref: txn.id, // pass transaction ID so webhook knows which txn to update
    }),
  })

  const lipwaData = await lipwaRes.json()

  if (!lipwaRes.ok) {
    return NextResponse.json({ error: lipwaData.message || 'STK Push failed' }, { status: 500 })
  }

  // 3. Save Lipwa reference on transaction
  await supabase
    .from('transactions')
    .update({ lipwa_ref: lipwaData.id })
    .eq('id', txn.id)

  return NextResponse.json({ transactionId: txn.id })
}