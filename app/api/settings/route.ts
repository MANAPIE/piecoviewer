import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();

    // 설정 저장 또는 업데이트
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        aiProvider: data.aiProvider,
        claudeApiKey: data.claudeApiKey || null,
        openaiApiKey: data.openaiApiKey || null,
        geminiApiKey: data.geminiApiKey || null,
        useMCP: data.useMCP || false,
        mcpServerCommand: data.mcpServerCommand || null,
        mcpServerArgs: data.mcpServerArgs || null,
        mcpServerEnv: data.mcpServerEnv || null,
        customPrompt: data.customPrompt || null,
        reviewLanguage: data.reviewLanguage,
        reviewStyle: data.reviewStyle
      },
      create: {
        userId: user.id,
        aiProvider: data.aiProvider,
        claudeApiKey: data.claudeApiKey || null,
        openaiApiKey: data.openaiApiKey || null,
        geminiApiKey: data.geminiApiKey || null,
        useMCP: data.useMCP || false,
        mcpServerCommand: data.mcpServerCommand || null,
        mcpServerArgs: data.mcpServerArgs || null,
        mcpServerEnv: data.mcpServerEnv || null,
        customPrompt: data.customPrompt || null,
        reviewLanguage: data.reviewLanguage,
        reviewStyle: data.reviewStyle
      }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Settings save error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}