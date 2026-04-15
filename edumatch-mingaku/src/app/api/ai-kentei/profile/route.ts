import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/app/_actions/user'

export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    return NextResponse.json({ profile: null })
  }

  return NextResponse.json({
    name: profile.name,
    legal_name: profile.legal_name ?? null,
    email: profile.email,
  })
}
