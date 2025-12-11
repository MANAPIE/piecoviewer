import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { userQueries, settingsQueries, reviewQueries } from '@/lib/db/sqlite';
import { createMCPClient } from '@/lib/mcp/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userQueries.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const settings = settingsQueries.findByUserId(user.id);

    if (!settings) {
      return NextResponse.json(
        { error: 'User settings not found' },
        { status: 404 }
      );
    }

    if (!settings.use_mcp) {
      return NextResponse.json(
        { error: 'MCP is not enabled' },
        { status: 400 }
      );
    }

    if (!settings.mcp_server_command) {
      return NextResponse.json(
        { error: 'MCP server command not configured' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { owner, repo, prNumber, pullRequest, files } = body as {
      owner: string;
      repo: string;
      prNumber: number;
      pullRequest: { title: string; body: string | null };
      files: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch?: string;
      }>;
    };

    // MCP 클라이언트 생성 및 연결
    const mcpClient = createMCPClient();

    try {
      await mcpClient.connect({
        name: 'piecoviewer-mcp-server',
        command: settings.mcp_server_command,
        args: settings.mcp_server_args ? JSON.parse(settings.mcp_server_args) : [],
        env: settings.mcp_server_env ? JSON.parse(settings.mcp_server_env) : {}
      });

      // MCP를 통한 리뷰 요청
      const result = await mcpClient.requestReview({
        owner,
        repo,
        prNumber,
        files,
        pullRequest,
        customPrompt: settings.custom_prompt || undefined
      });

      await mcpClient.disconnect();

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to generate review' },
          { status: 500 }
        );
      }

      // 리뷰 결과를 DB에 저장
      const review = reviewQueries.create({
        userId: user.id,
        repoOwner: owner,
        repoName: repo,
        prNumber,
        reviewContent: result.review || '',
        fileComments: JSON.stringify([]),
        aiProvider: 'mcp'
      });

      return NextResponse.json({
        success: true,
        review: result.review,
        reviewId: review.id
      });
    } catch (error) {
      await mcpClient.disconnect();
      throw error;
    }
  } catch (error) {
    console.error('MCP review error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to generate review';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}