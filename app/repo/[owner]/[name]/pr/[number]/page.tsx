import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { Octokit } from '@octokit/rest';
import { prisma } from '@/lib/db/prisma';
import PRReviewContent from './PRReviewContent';

export default async function PRReviewPage({
  params
}: {
  params: Promise<{ owner: string; name: string; number: string }>;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email! },
    include: { settings: true }
  });

  if (!user) {
    redirect('/login');
  }

  const { owner, name, number } = await params;
  const prNumber = parseInt(number);

  const octokit = new Octokit({ auth: user.accessToken });

  let pullRequest;
  let files;
  let githubReviews = [];
  let reviewCommentsResponse: { data: Array<{ id: number; path: string; line?: number; original_line?: number; body: string; user: { login: string; avatar_url: string } | null; created_at: string; html_url: string; pull_request_review_id?: number }> } | undefined;
  let fetchError = false;

  try {
    const prResponse = await octokit.pulls.get({
      owner,
      repo: name,
      pull_number: prNumber
    });
    pullRequest = prResponse.data;

    const filesResponse = await octokit.pulls.listFiles({
      owner,
      repo: name,
      pull_number: prNumber
    });
    files = filesResponse.data;

    // GitHub PR의 기존 리뷰들과 코멘트 가져오기
    const reviewsResponse = await octokit.pulls.listReviews({
      owner,
      repo: name,
      pull_number: prNumber
    });

    // PR 코멘트도 가져오기
    const commentsResponse = await octokit.issues.listComments({
      owner,
      repo: name,
      issue_number: prNumber
    });

    // 리뷰 코멘트 (라인별 코멘트) 가져오기
    reviewCommentsResponse = await octokit.pulls.listReviewComments({
      owner,
      repo: name,
      pull_number: prNumber
    });

    // 리뷰와 코멘트를 합치기
    const reviews = reviewsResponse.data.map(r => ({
      ...r,
      type: 'review' as const
    }));

    const comments = commentsResponse.data.map(c => ({
      id: c.id,
      user: c.user!,
      body: c.body || '',
      state: 'COMMENTED' as const,
      submitted_at: c.created_at,
      html_url: c.html_url,
      type: 'comment' as const
    }));

    // 시간순으로 정렬
    githubReviews = [...reviews, ...comments].sort((a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
  } catch (error) {
    console.error('Failed to fetch PR:', error);
    fetchError = true;
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              PR을 불러오는데 실패했습니다. 권한을 확인해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 게시되지 않은 리뷰만 가져오기
  const existingReview = await prisma.review.findFirst({
    where: {
      userId: user.id,
      repoOwner: owner,
      repoName: name,
      prNumber: prNumber,
      isPosted: false  // 게시되지 않은 리뷰만
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      reviewContent: true,
      fileComments: true,
      aiProvider: true,
      isPosted: true,
      createdAt: true
    }
  });

  // GitHub 사용자 정보 가져오기
  const githubUser = await octokit.users.getAuthenticated();
  const isOwnPR = pullRequest!.user.login === githubUser.data.login;

  // 기존 리뷰의 fileComments 파싱
  let existingFileComments: Array<{filename: string; line?: number; comment: string}> = [];

  // DB에 저장된 fileComments가 있으면 사용
  if (existingReview?.fileComments) {
    try {
      existingFileComments = JSON.parse(existingReview.fileComments);
    } catch (e) {
      console.error('Failed to parse fileComments:', e);
    }
  }
  // DB에 없으면 GitHub에서 가져온 review comments 사용
  else if (reviewCommentsResponse && reviewCommentsResponse.data.length > 0) {
    existingFileComments = reviewCommentsResponse.data.map((comment) => ({
      filename: comment.path,
      line: comment.line || comment.original_line,
      comment: comment.body
    }));
  }

  // GitHub의 라인별 코멘트를 별도로 전달
  const githubReviewComments = reviewCommentsResponse?.data.map((comment) => ({
    id: comment.id,
    user: comment.user,
    path: comment.path,
    line: comment.line || comment.original_line,
    body: comment.body,
    created_at: comment.created_at,
    html_url: comment.html_url,
    pull_request_review_id: comment.pull_request_review_id
  })) || [];

  return (
    <PRReviewContent
      pullRequest={pullRequest!}
      files={files!}
      owner={owner}
      name={name}
      prNumber={prNumber}
      existingReview={existingReview}
      existingFileComments={existingFileComments}
      userSettings={user.settings}
      githubReviews={githubReviews!}
      githubReviewComments={githubReviewComments}
      isOwnPR={isOwnPR}
    />
  );
}
