import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { Octokit } from '@octokit/rest';
import { userQueries, settingsQueries, reviewQueries, type Review } from '@/lib/db/sqlite';
import PRReviewContent from './PRReviewContent';

type GitHubPR = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  user: { login: string; avatar_url: string };
  state: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  head: { ref: string };
  base: { ref: string };
  [key: string]: unknown;
};

type GitHubFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  [key: string]: unknown;
};

export default async function PRReviewPage({
  params
}: {
  params: Promise<{ owner: string; name: string; number: string }>;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  const user = userQueries.findByEmail(session.user.email!);

  if (!user) {
    redirect('/login');
  }

  const settings = settingsQueries.findByUserId(user.id);

  const { owner, name, number } = await params;
  const prNumber = parseInt(number);

  const octokit = new Octokit({ auth: user.access_token });

  let pullRequest: GitHubPR | null = null;
  let files: GitHubFile[] = [];
  type GitHubReview = {
    id: number;
    user: { login: string; avatar_url: string } | null;
    body: string;
    state: string;
    submitted_at?: string;
    html_url: string;
    type: 'review' | 'comment';
    [key: string]: unknown;
  };
  let githubReviews: GitHubReview[] = [];
  type GitHubCommit = {
    sha: string;
    commit: {
      message: string;
      author: {
        name?: string;
        date?: string;
      } | null;
    };
    author: {
      login?: string;
      avatar_url?: string;
      [key: string]: unknown;
    } | null;
    html_url: string;
    [key: string]: unknown;
  };
  let commits: GitHubCommit[] = [];
  type ReviewCommentsResponse = {
    data: Array<{
      id: number;
      user: { login: string; avatar_url: string } | null;
      path: string;
      line?: number;
      original_line?: number;
      body: string;
      created_at: string;
      html_url: string;
      pull_request_review_id: number | null;
      original_commit_id?: string;
      commit_id?: string;
      in_reply_to_id?: number;
      [key: string]: unknown;
    }>;
  };
  let reviewCommentsResponse: ReviewCommentsResponse | null = null;
  let fetchError = false;

  try {
    const prResponse = await octokit.pulls.get({
      owner,
      repo: name,
      pull_number: prNumber
    });
    pullRequest = prResponse.data;

    // 모든 파일 가져오기 (페이지네이션 처리)
    let allFiles: GitHubFile[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const filesResponse = await octokit.pulls.listFiles({
        owner,
        repo: name,
        pull_number: prNumber,
        per_page: 100,
        page
      });

      allFiles = allFiles.concat(filesResponse.data);

      // 100개 미만이면 마지막 페이지
      if (filesResponse.data.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    files = allFiles.map(file => ({
      ...file,
      changes: file.changes || (file.additions + file.deletions)
    }));

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
      new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
    );

    // 커밋 목록 가져오기
    const commitsResponse = await octokit.pulls.listCommits({
      owner,
      repo: name,
      pull_number: prNumber
    });
    commits = commitsResponse.data;
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
  const allReviews = reviewQueries.findByPR(user.id, owner, name, prNumber);
  const existingReview = allReviews.find((r: Review) =>
    r.is_posted === 0
  );

  // GitHub 사용자 정보 가져오기
  const githubUser = await octokit.users.getAuthenticated();
  const isOwnPR = pullRequest!.user.login === githubUser.data.login;

  // 기존 리뷰의 fileComments 파싱
  let existingFileComments: Array<{filename: string; line?: number; comment: string}> = [];

  // DB에 저장된 fileComments가 있으면 사용
  if (existingReview?.file_comments) {
    try {
      existingFileComments = JSON.parse(existingReview.file_comments);
    } catch (e) {
      console.error('Failed to parse fileComments:', e);
    }
  }
  // DB에 없으면 GitHub에서 가져온 review comments 사용
  else if (reviewCommentsResponse && reviewCommentsResponse.data.length > 0) {
    existingFileComments = reviewCommentsResponse.data.map(comment => ({
      filename: comment.path,
      line: comment.line || comment.original_line,
      comment: comment.body
    }));
  }

  // GitHub의 라인별 코멘트를 별도로 전달
  const githubReviewComments = reviewCommentsResponse?.data.map(comment => ({
    id: comment.id,
    user: comment.user,
    path: comment.path,
    line: comment.line,
    original_line: comment.original_line,
    body: comment.body,
    created_at: comment.created_at,
    html_url: comment.html_url,
    original_commit_id: comment.original_commit_id as string | undefined,
    commit_id: comment.commit_id as string | undefined,
    in_reply_to_id: comment.in_reply_to_id,
    pull_request_review_id: comment.pull_request_review_id ?? undefined
  })) || [];

  // githubReviews를 PRReviewContent가 기대하는 형태로 변환 (user null 필터링)
  const formattedGithubReviews = githubReviews
    .filter(review => review.user !== null)
    .map((review) => ({
      id: review.id,
      user: review.user!,
      body: review.body,
      state: review.state,
      submitted_at: review.submitted_at || '',
      html_url: review.html_url
    }));

  // userSettings를 camelCase로 변환
  const formattedSettings = settings ? {
    aiProvider: settings.ai_provider,
    useMCP: settings.use_mcp === 1,
    claudeApiKey: settings.claude_api_key,
    openaiApiKey: settings.openai_api_key,
    geminiApiKey: settings.gemini_api_key,
    customPrompt: settings.custom_prompt,
    reviewLanguage: settings.review_language,
    reviewStyle: settings.review_style,
    analyzeCodebase: settings.analyze_codebase === 1
  } : null;

  return (
    <PRReviewContent
      pullRequest={pullRequest!}
      files={files!}
      commits={commits}
      owner={owner}
      name={name}
      prNumber={prNumber}
      existingReview={existingReview ? {
        id: existingReview.id,
        reviewContent: existingReview.review_content,
        aiProvider: existingReview.ai_provider,
        isPosted: existingReview.is_posted === 1,
        createdAt: new Date(existingReview.created_at)
      } : null}
      existingFileComments={existingFileComments}
      userSettings={formattedSettings}
      githubReviews={formattedGithubReviews}
      githubReviewComments={githubReviewComments}
      isOwnPR={isOwnPR}
    />
  );
}
