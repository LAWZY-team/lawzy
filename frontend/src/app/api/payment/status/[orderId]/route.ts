import { NextRequest, NextResponse } from 'next/server'
import { PayOSService } from '@/lib/payment/payos-client'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const status = await PayOSService.checkStatus(orderId)

    return NextResponse.json(status)
  } catch (error: unknown) {
    console.error('Check status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
