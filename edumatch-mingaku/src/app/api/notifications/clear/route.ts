import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 「エデュマッチ」サイトプレオープンのお知らせ以外の通知をクリアする
 */
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 「エデュマッチ」または「プレオープン」を含む通知を取得
    const preOpenNotifications = await prisma.inAppNotification.findMany({
      where: {
        user_id: user.id,
        OR: [
          { title: { contains: 'エデュマッチ' } },
          { title: { contains: 'プレオープン' } },
        ],
      },
      select: { id: true },
    })

    const preOpenIds = new Set(preOpenNotifications.map((n) => n.id))

    // それ以外の通知をすべて削除
    const result = await prisma.inAppNotification.deleteMany({
      where: {
        user_id: user.id,
        id: { notIn: Array.from(preOpenIds) },
      },
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    })
  } catch (error) {
    console.error('Failed to clear notifications:', error)
    return NextResponse.json(
      { error: '通知のクリアに失敗しました' },
      { status: 500 }
    )
  }
}
