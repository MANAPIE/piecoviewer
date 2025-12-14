import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { userQueries, settingsQueries } from '@/lib/db/sqlite';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userQueries.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();

    // 설정 저장 또는 업데이트
    settingsQueries.upsert(user.id, data);

    const settings = settingsQueries.findByUserId(user.id);

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Settings save error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
