import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { Octokit } from '@octokit/rest';
import { userQueries, settingsQueries, reviewQueries } from '@/lib/db/sqlite';
import DashboardContent from './DashboardContent';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  // 사용자 정보 가져오기
  const user = userQueries.findByEmail(session.user.email!);

  if (!user) {
    redirect('/login');
  }

  // 설정 가져오기
  const settings = settingsQueries.findByUserId(user.id);

  // user 객체에 settings 포함 (camelCase로 변환)
  const userWithSettings = {
    ...user,
    avatarUrl: user.avatar_url,
    accessToken: user.access_token,
    settings: settings ? {
      aiProvider: settings.ai_provider,
      reviewLanguage: settings.review_language,
      claudeApiKey: settings.claude_api_key,
      openaiApiKey: settings.openai_api_key,
      geminiApiKey: settings.gemini_api_key,
      useMCP: settings.use_mcp === 1
    } : null
  };

  // GitHub API로 저장소 목록 가져오기
  type GitHubRepo = {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    html_url: string;
    updated_at: string;
    stargazers_count: number;
    open_issues_count: number;
    owner: { login: string; avatar_url: string; type: string };
    [key: string]: unknown;
  };
  let repos: GitHubRepo[] = [];
  let githubUsername = '';
  let fetchError = false;
  let errorMessage = '';

  if (!user.access_token) {
    fetchError = true;
    errorMessage = 'GitHub 토큰이 없습니다. 다시 로그인해주세요.';
  } else {
    const octokit = new Octokit({ auth: user.access_token });

    try {
      // GitHub username 가져오기
      const userResponse = await octokit.users.getAuthenticated();
      githubUsername = userResponse.data.login;

      // 개인 저장소와 조직 저장소 모두 가져오기 (페이지네이션 처리)
      let allRepos: GitHubRepo[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await octokit.repos.listForAuthenticatedUser({
          sort: 'updated',
          per_page: 100,
          affiliation: 'owner,collaborator,organization_member',
          page
        });

        allRepos = allRepos.concat(response.data);

        // 100개 미만이면 마지막 페이지
        if (response.data.length < 100) {
          hasMore = false;
        } else {
          page++;
        }
      }

      repos = allRepos.map(repo => ({
        ...repo,
        updated_at: repo.updated_at || ''
      }));
    } catch (error: unknown) {
      console.error('Failed to fetch repositories:', error);
      fetchError = true;
      const errorObj = error as { message?: string; status?: number };
      errorMessage = errorObj?.message || 'GitHub API 호출에 실패했습니다.';

      // 401 에러면 토큰이 만료되었을 가능성
      if (errorObj?.status === 401) {
        errorMessage = 'GitHub 토큰이 만료되었습니다. 다시 로그인해주세요.';
      }
    }
  }

  // 최근 리뷰 내역 가져오기
  const dbReviews = reviewQueries.findByUserId(user.id, 10);
  const recentReviews = dbReviews.map(review => ({
    id: review.id,
    repoOwner: review.repo_owner,
    repoName: review.repo_name,
    prNumber: review.pr_number,
    prTitle: '', // DB에 없음
    aiProvider: review.ai_provider,
    createdAt: new Date(review.created_at)
  }));

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              저장소를 불러오는데 실패했습니다
            </h3>
            <p className="text-red-700 mb-4">{errorMessage}</p>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                로그아웃 후 다시 로그인
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardContent
      user={userWithSettings}
      repos={repos}
      recentReviews={recentReviews}
      githubUsername={githubUsername}
    />
  );
}
