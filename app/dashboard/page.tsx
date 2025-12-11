import   { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { Octokit } from '@octokit/rest';
import { prisma } from '@/lib/db/prisma';
import DashboardContent from './DashboardContent';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  // 사용자 정보 가져오기
  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email!
    },
    include: {
      settings: {
        select: {
          aiProvider: true,
          reviewLanguage: true,
          claudeApiKey: true,
          openaiApiKey: true,
          geminiApiKey: true,
          useMCP: true
        }
      }
    }
  });

  if (!user) {
    redirect('/login');
  }

  // GitHub API로 저장소 목록 가져오기
  let repos: any[] = [];
  let githubUsername = '';
  let fetchError = false;
  let errorMessage = '';

  if (!user.accessToken) {
    fetchError = true;
    errorMessage = 'GitHub 토큰이 없습니다. 다시 로그인해주세요.';
  } else {
    const octokit = new Octokit({ auth: user.accessToken });

    try {
      // GitHub username 가져오기
      const userResponse = await octokit.users.getAuthenticated();
      githubUsername = userResponse.data.login;

      // 개인 저장소와 조직 저장소 모두 가져오기
      const response = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator,organization_member'
      });
      repos = response.data;
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
  const recentReviews = await prisma.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

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
      user={user}
      repos={repos}
      recentReviews={recentReviews}
      githubUsername={githubUsername}
    />
  );
}
