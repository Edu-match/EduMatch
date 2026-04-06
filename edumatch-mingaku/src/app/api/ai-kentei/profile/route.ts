import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ profile: null })
  }

  return NextResponse.json({
    name: profile.name,
    legal_name: profile.legal_name ?? null,
    email: profile.email,
  })
}
