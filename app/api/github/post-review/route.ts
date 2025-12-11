import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Octokit } from '@octokit/rest';
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

    const { owner, repo, prNumber, review, reviewType = 'COMMENT', fileComments = [] } = await request.json();

    // GitHub API 클라이언트 생성
    const octokit = new Octokit({ auth: user.accessToken });

    // 라인별 코멘트가 있는 경우 리뷰로 게시
    if (fileComments.length > 0) {
      // pulls.createReview with comments array
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body: review,
        event: reviewType === 'COMMENT' ? 'COMMENT' : reviewType as 'APPROVE' | 'REQUEST_CHANGES',
        comments: fileComments
          .filter((fc: { filename: string; line?: number; comment: string }) => fc.line) // 라인이 있는 것만 사용
          .map((fc: { filename: string; line?: number; comment: string }) => ({
            path: fc.filename,
            line: fc.line!,
            body: fc.comment
          }))
      });
    } else {
      // 라인별 코멘트가 없는 경우 기존 방식 사용
      if (reviewType === 'COMMENT') {
        // 일반 코멘트로 게시
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: review
        });
      } else {
        // 공식 리뷰로 게시 (APPROVE, REQUEST_CHANGES, COMMENT)
        await octokit.pulls.createReview({
          owner,
          repo,
          pull_number: prNumber,
          body: review,
          event: reviewType as 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
        });
      }
    }

    // DB에서 리뷰를 찾아서 isPosted 업데이트
    await prisma.review.updateMany({
      where: {
        userId: user.id,
        repoOwner: owner,
        repoName: repo,
        prNumber
      },
      data: {
        isPosted: true
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Post review error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to post review';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
