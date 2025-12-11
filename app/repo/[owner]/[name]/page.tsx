import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { Octokit } from '@octokit/rest';
import { userQueries } from '@/lib/db/sqlite';
import RepoContent from './RepoContent';

type PullRequest = {
  id: number;
  number: number;
  title: string;
  user: { login: string; avatar_url: string };
  state: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  [key: string]: unknown;
};

type Repository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  private: boolean;
  [key: string]: unknown;
};

export default async function RepoPage({
  params
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  const user = userQueries.findByEmail(session.user.email!);

  if (!user) {
    redirect('/login');
  }

  const { owner, name } = await params;

  let repo: Repository | null = null;
  let openPullRequests: PullRequest[] = [];
  let closedPullRequests: PullRequest[] = [];
  let fetchError = false;
  let errorMessage = '';

  if (!user.access_token) {
    fetchError = true;
    errorMessage = 'GitHub 토큰이 없습니다. 다시 로그인해주세요.';
  } else {
    const octokit = new Octokit({ auth: user.access_token });

    try {
      const repoResponse = await octokit.repos.get({ owner, repo: name });
      repo = repoResponse.data;

      const openPRResponse = await octokit.pulls.list({
        owner,
        repo: name,
        state: 'open',
        sort: 'updated',
        per_page: 100
      });
      openPullRequests = openPRResponse.data.filter(pr => pr.user !== null) as PullRequest[];

      const closedPRResponse = await octokit.pulls.list({
        owner,
        repo: name,
        state: 'closed',
        sort: 'updated',
        per_page: 100
      });
      closedPullRequests = closedPRResponse.data.filter(pr => pr.user !== null) as PullRequest[];
    } catch (error: unknown) {
      console.error('Failed to fetch repository:', error);
      fetchError = true;
      const errorObj = error as { message?: string; status?: number };
      errorMessage = errorObj?.message || 'GitHub API 호출에 실패했습니다.';

      // 404 에러면 저장소를 찾을 수 없음
      if (errorObj?.status === 404) {
        errorMessage = `저장소 ${owner}/${name}를 찾을 수 없거나 접근 권한이 없습니다.`;
      }
      // 401 에러면 토큰이 만료되었을 가능성
      else if (errorObj?.status === 401) {
        errorMessage = 'GitHub 토큰이 만료되었습니다. 다시 로그인해주세요.';
      }
    }
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              저장소를 불러오는데 실패했습니다
            </h3>
            <p className="text-red-700 mb-4">{errorMessage}</p>
            <div className="flex gap-3">
              <a
                href="/dashboard"
                className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                대시보드로 돌아가기
              </a>
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
      </div>
    );
  }

  return (
    <RepoContent
      repo={repo!}
      openPullRequests={openPullRequests!}
      closedPullRequests={closedPullRequests!}
      owner={owner}
      name={name}
    />
  );
}