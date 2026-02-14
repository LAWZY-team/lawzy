import { NextRequest, NextResponse } from 'next/server'
import { PayOSService } from '@/lib/payment/payos-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, plan, amount } = body

    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await PayOSService.createPayment({
      userId,
      plan,
      amount: amount || 1200000,
      currency: 'VND',
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    )
  }
}
