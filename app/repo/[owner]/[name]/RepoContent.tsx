'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaGithub,
  FaStar,
  FaCodeBranch,
  FaExclamationCircle,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

type PullRequest = {
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  state: string;
  html_url: string;
  additions?: number;
  deletions?: number;
  changed_files?: number;
};

type Repo = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  private: boolean;
};

export default function RepoContent({
  repo,
  openPullRequests,
  closedPullRequests,
  owner,
  name
}: {
  repo: Repo;
  openPullRequests: PullRequest[];
  closedPullRequests: PullRequest[];
  owner: string;
  name: string;
}) {
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const activePRs = activeTab === 'open' ? openPullRequests : closedPullRequests;

  const filteredPRs = activePRs.filter(
    (pr) =>
      pr.title.toLowerCase().includes(filter.toLowerCase()) ||
      pr.user.login.toLowerCase().includes(filter.toLowerCase())
  );

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredPRs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPRs = filteredPRs.slice(startIndex, endIndex);

  // 탭이나 필터 변경 시 페이지 초기화
  const handleTabChange = (tab: 'open' | 'closed') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <FaArrowLeft />
            대시보드로 돌아가기
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FaGithub className="text-2xl text-gray-700 dark:text-gray-300" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {repo.full_name}
                </h1>
                {repo.private && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                    Private
                  </span>
                )}
              </div>
              {repo.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">{repo.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <FaStar className="text-yellow-500" />
                  {repo.stargazers_count}
                </span>
                <span className="flex items-center gap-1">
                  <FaCodeBranch />
                  {repo.forks_count} forks
                </span>
                <span className="flex items-center gap-1">
                  <FaExclamationCircle />
                  {repo.open_issues_count} issues
                </span>
              </div>
            </div>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            >
              GitHub에서 보기
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleTabChange('open')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'open'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            열린 PR ({openPullRequests.length})
            {activeTab === 'open' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('closed')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'closed'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            닫힌 PR ({closedPullRequests.length})
            {activeTab === 'closed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
            )}
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="PR 검색..."
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {paginatedPRs.length > 0 ? (
          <>
            <div className="space-y-4">
              {paginatedPRs.map((pr) => (
                <Link
                  key={pr.number}
                  href={`/repo/${owner}/${name}/pr/${pr.number}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pr.user.avatar_url}
                      alt={pr.user.login}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {pr.title}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                          #{pr.number}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>by {pr.user.login}</span>
                        <span>•</span>
                        <span>
                          {new Date(pr.created_at).toLocaleDateString('ko-KR')}
                        </span>
                        {pr.changed_files && (
                          <>
                            <span>•</span>
                            <span>{pr.changed_files} files changed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
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
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              {activePRs.length === 0
                ? activeTab === 'open' ? '열린 Pull Request가 없습니다.' : '닫힌 Pull Request가 없습니다.'
                : '검색 결과가 없습니다.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}