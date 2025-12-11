'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { FaGithub, FaCodeBranch, FaStar, FaClock, FaSignOutAlt, FaCog, FaExclamationTriangle, FaUsers, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Link from 'next/link';

type Repo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  updated_at: string;
  stargazers_count: number;
  open_issues_count: number;
  owner: {
    login: string;
    type: string;
  };
};

type Review = {
  id: string;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  prTitle: string;
  aiProvider: string;
  createdAt: Date;
};

type User = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  settings: {
    aiProvider: string;
    reviewLanguage: string;
    claudeApiKey: string | null;
    openaiApiKey: string | null;
    geminiApiKey: string | null;
    useMCP: boolean;
  } | null;
};

export default function DashboardContent({
  user,
  repos,
  recentReviews,
  githubUsername
}: {
  user: User;
  repos: Repo[];
  recentReviews: Review[];
  githubUsername: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const reposPerPage = 10;

  // 조직 목록 추출
  const organizations = Array.from(
    new Set(
      repos
        .filter(repo => repo.owner.type === 'Organization')
        .map(repo => repo.owner.login)
    )
  ).sort();

  // 필터링된 저장소
  const filteredRepos = repos.filter(repo => {
    // 검색어 필터
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // 조직 필터
    let matchesOrg = true;
    if (selectedOrg === 'personal') {
      matchesOrg = repo.owner.login.toLowerCase() === githubUsername.toLowerCase();
    } else if (selectedOrg !== 'all') {
      matchesOrg = repo.owner.login === selectedOrg;
    }

    return matchesSearch && matchesOrg;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredRepos.length / reposPerPage);
  const startIndex = (currentPage - 1) * reposPerPage;
  const endIndex = startIndex + reposPerPage;
  const paginatedRepos = filteredRepos.slice(startIndex, endIndex);

  // 검색어나 필터 변경 시 페이지 초기화
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleOrgChange = (org: string) => {
    setSelectedOrg(org);
    setCurrentPage(1);
  };

  // API 키 또는 MCP가 설정되어 있는지 확인
  const hasValidConfig = user.settings && (
    user.settings.useMCP || // MCP를 사용하거나
    (user.settings.aiProvider === 'claude' && user.settings.claudeApiKey) ||
    (user.settings.aiProvider === 'openai' && user.settings.openaiApiKey) ||
    (user.settings.aiProvider === 'gemini' && user.settings.geminiApiKey)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PIEcoviewer</h1>
            </div>
            <div className="flex items-center gap-0">
              <div className="relative group">
                <Link
                  href="/settings"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    !hasValidConfig
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {!hasValidConfig && <FaExclamationTriangle className="text-yellow-600" />}
                  <FaCog />
                  설정
                </Link>
                {!hasValidConfig && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 rounded-lg shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="flex items-start gap-2">
                      <FaExclamationTriangle className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-yellow-800 dark:text-yellow-200">
                        <p className="font-semibold mb-1">AI 설정이 필요합니다</p>
                        <p>AI 리뷰를 사용하려면 설정에서 {user.settings?.aiProvider === 'claude' ? 'Claude' : user.settings?.aiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API 키를 등록하거나 MCP 서버를 설정해주세요.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <a
                href={`https://github.com/${githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors h-10"
              >
                {user.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.name || '사용자'}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="text-sm">{user.name}</span>
              </a>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FaSignOutAlt />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                내 저장소
              </h2>
              <input
                type="text"
                placeholder="저장소 검색..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 mb-4"
              />

              {/* 조직 필터 탭 */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => handleOrgChange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedOrg === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => handleOrgChange('personal')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                    selectedOrg === 'personal'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <FaGithub className="text-sm" />
                  개인
                </button>
                {organizations.map((org) => (
                  <button
                    key={org}
                    onClick={() => handleOrgChange(org)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                      selectedOrg === org
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <FaUsers className="text-sm" />
                    {org}
                  </button>
                ))}
              </div>
            </div>

            {paginatedRepos.length > 0 ? (
              <>
                <div className="space-y-4">
                  {paginatedRepos.map((repo) => {
                const [owner, name] = repo.full_name?.split('/') || [];

                // full_name이 없거나 유효하지 않으면 건너뛰기
                if (!owner || !name) {
                  console.warn('Invalid repo data:', repo);
                  return null;
                }

                // 소유자가 본인인지 확인
                const isOwner = repo.owner.login.toLowerCase() === githubUsername.toLowerCase();
                const isOrganization = repo.owner.type === 'Organization';

                return (
                  <Link
                    key={repo.id}
                    href={`/repo/${owner}/${name}`}
                    className={`block bg-white dark:bg-gray-800 rounded-lg border p-6 hover:shadow-md transition-all ${
                      !isOwner
                        ? 'border-blue-300 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-600'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-500'
                    }`}
                  >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FaGithub className="text-gray-700 dark:text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {repo.name}
                        </h3>
                        {repo.private && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded">
                            Private
                          </span>
                        )}
                        {!isOwner && (
                          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded flex items-center gap-1">
                            {isOrganization ? <FaUsers className="text-xs" /> : null}
                            {repo.owner.login}
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <FaStar className="text-yellow-500" />
                          {repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaCodeBranch />
                          {repo.open_issues_count} open PRs
                        </span>
                        <span className="flex items-center gap-1">
                          <FaClock />
                          {new Date(repo.updated_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaChevronLeft />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // 현재 페이지 주변만 표시
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-purple-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-gray-500 dark:text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

          {/* 사이드바 */}
          <div className="space-y-6 sticky top-27 self-start">
            {/* AI 설정 정보 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                AI 설정
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">AI Provider:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {user.settings?.aiProvider === 'claude' ? 'Claude (Anthropic)' :
                     user.settings?.aiProvider === 'openai' ? 'GPT-4 (OpenAI)' :
                     user.settings?.aiProvider === 'gemini' ? 'Gemini (Google)' :
                     'Claude (Anthropic)'}
                    {user.settings?.useMCP && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs">
                        MCP
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">리뷰 언어:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {user.settings?.reviewLanguage === 'ko' ? '한국어' : user.settings?.reviewLanguage === 'en' ? 'English' : user.settings?.reviewLanguage || '한국어'}
                  </span>
                </div>
              </div>
            </div>

            {/* 최근 리뷰 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                최근 리뷰
              </h3>
              {recentReviews.length > 0 ? (
                <div className="space-y-3">
                  {recentReviews.map((review) => (
                    <Link
                      key={review.id}
                      href={`/repo/${review.repoOwner}/${review.repoName}/pr/${review.prNumber}`}
                      className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {review.prTitle}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        #{review.prNumber} • {review.repoName}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">아직 리뷰가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
