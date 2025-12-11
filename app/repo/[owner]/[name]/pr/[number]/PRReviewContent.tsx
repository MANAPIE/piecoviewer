'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft,
  FaRobot,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaGithub,
  FaEdit,
  FaSave,
  FaTimes,
  FaComment,
  FaThumbsUp,
  FaExclamationCircle,
  FaPlus,
  FaTrash,
  FaCode
} from 'react-icons/fa';

type PullRequest = {
  number: number;
  title: string;
  body: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  state: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
};

type File = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

type Review = {
  id: string;
  reviewContent: string;
  aiProvider: string;
  isPosted: boolean;
  createdAt: Date;
} | null;

type UserSettings = {
  aiProvider: string;
  useMCP?: boolean;
  claudeApiKey?: string | null;
  openaiApiKey?: string | null;
  geminiApiKey?: string | null;
  customPrompt: string | null;
  reviewLanguage: string;
  reviewStyle: string;
} | null;

type GitHubReview = {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  state: string;
  submitted_at: string;
  html_url: string;
};

type GitHubReviewComment = {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  path: string;
  line?: number;
  body: string;
  created_at: string;
  html_url: string;
  pull_request_review_id?: number;
};

export default function PRReviewContent({
  pullRequest,
  files,
  owner,
  name,
  prNumber,
  existingReview,
  existingFileComments = [],
  userSettings,
  githubReviews,
  githubReviewComments = [],
  isOwnPR = false
}: {
  pullRequest: PullRequest;
  files: File[];
  owner: string;
  name: string;
  prNumber: number;
  existingReview: Review;
  existingFileComments?: Array<{filename: string; line?: number; comment: string}>;
  userSettings: UserSettings;
  githubReviews: GitHubReview[];
  githubReviewComments?: GitHubReviewComment[];
  isOwnPR?: boolean;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState(existingReview?.reviewContent || '');
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedReview, setEditedReview] = useState('');
  const [reviewType, setReviewType] = useState<'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'>('COMMENT');
  const [fileComments, setFileComments] = useState<Array<{filename: string; line?: number; comment: string}>>(existingFileComments);
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState({ filename: '', line: '', comment: '' });

  const router = useRouter();

  // API 키 또는 MCP 설정 여부 확인
  const hasValidConfig = userSettings && (
    userSettings.useMCP || // MCP를 사용하거나
    (userSettings.aiProvider === 'claude' && userSettings.claudeApiKey) ||
    (userSettings.aiProvider === 'openai' && userSettings.openaiApiKey) ||
    (userSettings.aiProvider === 'gemini' && userSettings.geminiApiKey)
  );

  const handleReview = async () => {
    setReviewing(true);
    setMessage('');

    try {
      // MCP 사용 여부에 따라 다른 API 호출
      const apiEndpoint = userSettings?.useMCP ? '/api/mcp/review' : '/api/ai/review';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo: name,
          prNumber,
          pullRequest,
          files
        })
      });

      if (!response.ok) throw new Error('Failed to generate review');

      const data = await response.json();
      setReview(data.review);
      setFileComments(data.fileComments || []);
      setMessage('AI 리뷰가 생성되었습니다!');
    } catch {
      setMessage('리뷰 생성에 실패했습니다.');
    } finally {
      setReviewing(false);
    }
  };

  const handleEdit = () => {
    setEditedReview(review);
    setIsEditing(true);
  };

  const handleSave = () => {
    setReview(editedReview);
    setIsEditing(false);
    setMessage('리뷰가 수정되었습니다!');
  };

  const handleCancel = () => {
    setEditedReview('');
    setIsEditing(false);
  };

  const handlePostToGithub = async () => {
    setPosting(true);
    setMessage('');

    try {
      const response = await fetch('/api/github/post-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo: name,
          prNumber,
          review,
          reviewType,
          fileComments
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post review');
      }

      setMessage('GitHub에 리뷰가 게시되었습니다!');

      // 폼 초기화
      setReview('');
      setFileComments([]);
      setReviewType('COMMENT');

      // 페이지 데이터 새로고침 (기존 리뷰 목록 업데이트)
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '리뷰 게시에 실패했습니다.';
      setMessage(`리뷰 게시에 실패했습니다: ${errorMessage}`);
    } finally {
      setPosting(false);
    }
  };

  const handleEditComment = (index: number) => {
    setEditingCommentIndex(index);
  };

  const handleSaveComment = (index: number, updatedComment: { filename: string; line?: number; comment: string }) => {
    const updatedComments = [...fileComments];
    updatedComments[index] = updatedComment;
    setFileComments(updatedComments);
    setEditingCommentIndex(null);
    setMessage('코멘트가 수정되었습니다!');
  };

  const handleDeleteComment = (index: number) => {
    const updatedComments = fileComments.filter((_, idx) => idx !== index);
    setFileComments(updatedComments);
    setMessage('코멘트가 삭제되었습니다!');
  };

  const handleAddComment = () => {
    setIsAddingComment(true);
    setNewComment({ filename: files[0]?.filename || '', line: '', comment: '' });
  };

  const handleSaveNewComment = () => {
    if (!newComment.filename || !newComment.comment) {
      setMessage('파일명과 코멘트는 필수입니다.');
      return;
    }

    const commentToAdd = {
      filename: newComment.filename,
      line: newComment.line ? parseInt(newComment.line) : undefined,
      comment: newComment.comment
    };

    setFileComments([...fileComments, commentToAdd]);
    setIsAddingComment(false);
    setNewComment({ filename: '', line: '', comment: '' });
    setMessage('새 코멘트가 추가되었습니다!');
  };

  const handleCancelNewComment = () => {
    setIsAddingComment(false);
    setNewComment({ filename: '', line: '', comment: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={`/repo/${owner}/${name}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <FaArrowLeft />
            저장소로 돌아가기
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pullRequest.user.avatar_url}
                  alt={pullRequest.user.login}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {pullRequest.title}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    #{pullRequest.number} opened by {pullRequest.user.login}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                  {pullRequest.base.ref} ← {pullRequest.head.ref}
                </span>
                <span className="text-green-600 dark:text-green-400">+{pullRequest.additions}</span>
                <span className="text-red-600 dark:text-red-400">-{pullRequest.deletions}</span>
                <span>{pullRequest.changed_files} files changed</span>
              </div>
            </div>
            <a
              href={pullRequest.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            >
              <FaGithub />
              GitHub에서 보기
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: 파일 변경사항 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              변경된 파일 ({files.length})
            </h2>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.filename}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {file.filename}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        file.status === 'added'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : file.status === 'removed'
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}
                    >
                      {file.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-green-600 dark:text-green-400">+{file.additions}</span>
                    <span className="text-red-600 dark:text-red-400">-{file.deletions}</span>
                    <span>{file.changes} changes</span>
                  </div>
                  {file.patch && (
                    <pre className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto max-h-40">
                      <code className="text-gray-800 dark:text-gray-100">{file.patch}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>

            {pullRequest.body && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  PR 설명
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {pullRequest.body}
                  </p>
                </div>
              </div>
            )}

            {/* GitHub 리뷰 목록 */}
            {githubReviews.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  기존 리뷰 ({githubReviews.length})
                </h3>
                <div className="space-y-3">
                  {githubReviews.map((review) => {
                    // 이 리뷰에 속한 라인별 코멘트 찾기
                    const reviewLineComments = githubReviewComments.filter(
                      (comment) => comment.pull_request_review_id === review.id
                    );

                    return (
                      <div
                        key={review.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                      >
                        <div className="flex items-start gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={review.user.avatar_url}
                            alt={review.user.login}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {review.user.login}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${
                                  review.state === 'APPROVED'
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                    : review.state === 'CHANGES_REQUESTED'
                                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}
                              >
                                {review.state === 'APPROVED' && <FaThumbsUp className="text-xs" />}
                                {review.state === 'CHANGES_REQUESTED' && <FaExclamationCircle className="text-xs" />}
                                {review.state === 'COMMENTED' && <FaComment className="text-xs" />}
                                {review.state === 'APPROVED' ? '승인' : review.state === 'CHANGES_REQUESTED' ? '변경 요청' : '코멘트'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(review.submitted_at).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {review.body && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">
                                {review.body}
                              </p>
                            )}

                            {/* 라인별 코멘트 표시 */}
                            {reviewLineComments.length > 0 && (
                              <div className="mt-3 space-y-2 pl-3 border-l-2 border-purple-200 dark:border-purple-800">
                                {reviewLineComments.map((comment) => (
                                  <div key={comment.id} className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs font-mono">
                                        <FaCode className="text-xs" />
                                        {comment.path}
                                      </span>
                                      {comment.line && (
                                        <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                                          Line {comment.line}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {comment.body}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            <a
                              href={review.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                            >
                              <FaGithub />
                              GitHub에서 보기
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: AI 리뷰 */}
          <div>
            <div className="sticky top-49">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI 코드 리뷰
                </h2>
                {userSettings && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {userSettings.aiProvider}
                  </span>
                )}
              </div>

              {!review ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                  {reviewing ? (
                    <>
                      <div className="relative mb-6">
                        <div className="w-20 h-20 mx-auto">
                          <FaRobot className="absolute inset-0 m-auto text-3xl text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        AI 리뷰 생성 중
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        코드를 분석하고 있습니다. 잠시만 기다려주세요...
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <FaRobot className="text-5xl text-purple-500 mx-auto mb-4" />

                      {!hasValidConfig ? (
                        <>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-2 text-left">
                              <FaTimesCircle className="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <p className="font-semibold mb-1">AI 설정이 필요합니다</p>
                                <p>
                                  AI 리뷰를 사용하려면 {userSettings?.aiProvider === 'claude' ? 'Claude' : userSettings?.aiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API 키를 등록하거나 MCP 서버를 설정해주세요.
                                </p>
                              </div>
                            </div>
                          </div>
                          <Link
                            href="/settings"
                            className="flex items-center justify-center gap-2 w-full bg-yellow-600 dark:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors"
                          >
                            <FaTimesCircle />
                            설정으로 이동
                          </Link>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            AI가 코드를 분석하고 리뷰를 생성합니다
                          </p>
                          <button
                            onClick={handleReview}
                            disabled={reviewing}
                            className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <FaRobot />
                            AI 리뷰 시작
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <FaCheckCircle />
                        <span className="font-medium">리뷰 완료</span>
                      </div>
                      {!isEditing && (
                        <button
                          onClick={handleEdit}
                          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <FaEdit />
                          수정
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editedReview}
                        onChange={(e) => setEditedReview(e.target.value)}
                        className="w-full h-96 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none font-mono text-sm"
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                          {review}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* 라인별 코멘트 - 편집 가능 */}
                  {!isEditing && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          라인별 코멘트 ({fileComments.length})
                        </h3>
                        <button
                          onClick={handleAddComment}
                          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                        >
                          <FaPlus className="text-xs" />
                          추가
                        </button>
                      </div>

                      <div className="space-y-3">
                        {fileComments.map((comment, idx) => (
                          <div key={idx}>
                            {editingCommentIndex === idx ? (
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      파일명
                                    </label>
                                    <select
                                      value={comment.filename}
                                      onChange={(e) => {
                                        const updated = [...fileComments];
                                        updated[idx] = { ...comment, filename: e.target.value };
                                        setFileComments(updated);
                                      }}
                                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                      {files.map((file) => (
                                        <option key={file.filename} value={file.filename}>
                                          {file.filename}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      라인 번호 (선택사항)
                                    </label>
                                    <input
                                      type="number"
                                      value={comment.line || ''}
                                      onChange={(e) => {
                                        const updated = [...fileComments];
                                        updated[idx] = { ...comment, line: e.target.value ? parseInt(e.target.value) : undefined };
                                        setFileComments(updated);
                                      }}
                                      placeholder="라인 번호"
                                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      코멘트
                                    </label>
                                    <textarea
                                      value={comment.comment}
                                      onChange={(e) => {
                                        const updated = [...fileComments];
                                        updated[idx] = { ...comment, comment: e.target.value };
                                        setFileComments(updated);
                                      }}
                                      rows={3}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSaveComment(idx, comment)}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition-colors"
                                    >
                                      <FaSave className="text-xs" />
                                      저장
                                    </button>
                                    <button
                                      onClick={() => setEditingCommentIndex(null)}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                    >
                                      <FaTimes className="text-xs" />
                                      취소
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-mono text-xs text-purple-700 dark:text-purple-300">
                                        {comment.filename}
                                      </span>
                                      {comment.line && (
                                        <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                                          Line {comment.line}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                      {comment.comment}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleEditComment(idx)}
                                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                                      title="수정"
                                    >
                                      <FaEdit className="text-xs" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(idx)}
                                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                      title="삭제"
                                    >
                                      <FaTrash className="text-xs" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* 새 코멘트 추가 폼 */}
                        {isAddingComment && (
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  파일명
                                </label>
                                <select
                                  value={newComment.filename}
                                  onChange={(e) => setNewComment({ ...newComment, filename: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                  {files.map((file) => (
                                    <option key={file.filename} value={file.filename}>
                                      {file.filename}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  라인 번호 (선택사항)
                                </label>
                                <input
                                  type="number"
                                  value={newComment.line}
                                  onChange={(e) => setNewComment({ ...newComment, line: e.target.value })}
                                  placeholder="라인 번호"
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  코멘트
                                </label>
                                <textarea
                                  value={newComment.comment}
                                  onChange={(e) => setNewComment({ ...newComment, comment: e.target.value })}
                                  placeholder="코멘트를 입력하세요..."
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveNewComment}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors"
                                >
                                  <FaSave className="text-xs" />
                                  추가
                                </button>
                                <button
                                  onClick={handleCancelNewComment}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                  <FaTimes className="text-xs" />
                                  취소
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {fileComments.length === 0 && !isAddingComment && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                            라인별 코멘트가 없습니다. 추가 버튼을 눌러 코멘트를 작성하세요.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancel}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <FaTimes />
                        취소
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                      >
                        <FaSave />
                        저장
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* 리뷰 타입 선택 */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          리뷰 타입 선택 {isOwnPR && <span className="text-xs text-gray-500 dark:text-gray-400">(자신의 PR에는 코멘트만 가능)</span>}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setReviewType('COMMENT')}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              reviewType === 'COMMENT'
                                ? 'bg-gray-900 dark:bg-gray-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <FaComment className="text-xs" />
                            코멘트
                          </button>
                          <button
                            onClick={() => !isOwnPR && setReviewType('APPROVE')}
                            disabled={isOwnPR}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isOwnPR
                                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                : reviewType === 'APPROVE'
                                ? 'bg-green-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <FaThumbsUp className="text-xs" />
                            승인
                          </button>
                          <button
                            onClick={() => !isOwnPR && setReviewType('REQUEST_CHANGES')}
                            disabled={isOwnPR}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isOwnPR
                                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                : reviewType === 'REQUEST_CHANGES'
                                ? 'bg-red-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <FaExclamationCircle className="text-xs" />
                            변경 요청
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleReview}
                          disabled={reviewing}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                        >
                          {reviewing ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              재생성 중...
                            </>
                          ) : (
                            '리뷰 재생성'
                          )}
                        </button>
                        <button
                          onClick={handlePostToGithub}
                          disabled={posting}
                          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          {posting ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              게시 중...
                            </>
                          ) : (
                            <>
                              <FaGithub />
                              GitHub에 게시
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}

                  {message && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg ${
                        message.includes('실패')
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      }`}
                    >
                      {message.includes('실패') ? (
                        <FaTimesCircle />
                      ) : (
                        <FaCheckCircle />
                      )}
                      <span className="text-sm">{message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
