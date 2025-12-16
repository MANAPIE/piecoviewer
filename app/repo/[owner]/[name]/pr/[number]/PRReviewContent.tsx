'use client';

import { useState, useEffect, useRef } from 'react';
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

// 코드 뷰어 컴포넌트
function CodeViewer({ file, targetLine }: { file: File; targetLine?: number }) {
  const targetLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 타겟 라인으로 스크롤 (컨테이너 내부에서만)
  useEffect(() => {
    if (targetLineRef.current && containerRef.current && targetLine) {
      setTimeout(() => {
        const container = containerRef.current;
        const target = targetLineRef.current;
        if (!container || !target) return;

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top;
        const scrollPosition = container.scrollTop + relativeTop - containerRect.height / 2 + targetRect.height / 2;

        container.scrollTop = scrollPosition;
      }, 100);
    }
  }, [targetLine]);

  if (!file.patch) return null;

  const lines = file.patch.split('\n');
  let currentLineNum = 0;

  return (
    <div ref={containerRef} className="mt-2 bg-gray-900 dark:bg-black rounded-lg overflow-auto max-h-96 border border-gray-700">
      <div className="text-xs font-mono p-3">
        {lines.map((line, lineIdx) => {
          const lineMatch = line.match(/^@@\s+-\d+,?\d*\s+\+(\d+),?\d*\s+@@/);
          if (lineMatch) {
            currentLineNum = parseInt(lineMatch[1]) - 1;
          }

          const isAddition = line.startsWith('+') && !line.startsWith('+++');
          const isDeletion = line.startsWith('-') && !line.startsWith('---');
          const isHeader = line.startsWith('@@');

          if (!isHeader && !isDeletion) {
            currentLineNum++;
          }

          const isTargetLine = targetLine && currentLineNum === targetLine;

          // + 또는 - 기호와 코드 사이에 공백 추가
          let displayLine = line;
          if (isAddition) {
            displayLine = '+ ' + line.substring(1);
          } else if (isDeletion) {
            displayLine = '- ' + line.substring(1);
          }

          return (
            <div
              key={lineIdx}
              ref={isTargetLine ? targetLineRef : null}
              className={`flex ${
                isTargetLine
                  ? 'bg-purple-900/50 border-l-2 border-purple-400'
                  : isAddition
                  ? 'bg-green-900/20'
                  : isDeletion
                  ? 'bg-red-900/20'
                  : ''
              }`}
            >
              <span className="inline-block w-12 text-right pr-3 text-gray-500 dark:text-gray-600 select-none flex-shrink-0">
                {!isHeader && !isDeletion ? currentLineNum : ''}
              </span>
              <code
                className={`block whitespace-pre-wrap break-all ${
                  isAddition
                    ? 'text-green-400'
                    : isDeletion
                    ? 'text-red-400'
                    : isHeader
                    ? 'text-blue-400'
                    : 'text-gray-300'
                }`}
              >
                {displayLine}
              </code>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 원본 파일 뷰어 컴포넌트 (diff가 아닌 전체 파일 표시)
function PlainFileViewer({ content, targetLine }: { content: string; targetLine?: number }) {
  const targetLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 타겟 라인으로 스크롤
  useEffect(() => {
    if (targetLineRef.current && containerRef.current && targetLine) {
      setTimeout(() => {
        const container = containerRef.current;
        const target = targetLineRef.current;
        if (!container || !target) return;

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top;
        const scrollPosition = container.scrollTop + relativeTop - containerRect.height / 2 + targetRect.height / 2;

        container.scrollTop = scrollPosition;
      }, 100);
    }
  }, [targetLine]);

  const lines = content.split('\n');

  return (
    <div ref={containerRef} className="mt-2 bg-gray-800 dark:bg-gray-900 rounded-lg overflow-auto max-h-96 border border-gray-600">
      <div className="text-xs font-mono p-3">
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const isTargetLine = targetLine && lineNum === targetLine;

          return (
            <div
              key={idx}
              ref={isTargetLine ? targetLineRef : null}
              className={`flex ${
                isTargetLine
                  ? 'bg-blue-900/50 border-l-2 border-blue-400'
                  : ''
              }`}
            >
              <span className="inline-block w-12 text-right pr-3 text-gray-500 dark:text-gray-600 select-none flex-shrink-0">
                {lineNum}
              </span>
              <code className="block whitespace-pre-wrap break-all text-gray-200">
                {line}
              </code>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  analyzeCodebase: boolean;
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
  original_line?: number;
  original_commit_id?: string;
  commit_id?: string;
  in_reply_to_id?: number;
};

type Commit = {
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

export default function PRReviewContent({
  pullRequest,
  files,
  commits,
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
  commits: Commit[];
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
  const [hasGeneratedReview, setHasGeneratedReview] = useState(!!existingReview);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedReview, setEditedReview] = useState('');
  const [reviewType, setReviewType] = useState<'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'>('COMMENT');
  const [fileComments, setFileComments] = useState<Array<{filename: string; line?: number; comment: string}>>(existingFileComments);
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState({ filename: '', line: '', comment: '' });
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  // 원본 코드 표시 상태 관리
  const [showingOriginalCode, setShowingOriginalCode] = useState<Record<number, boolean>>({});
  const [originalCodeData, setOriginalCodeData] = useState<Record<number, { filename: string; content: string; commitSha: string } | null>>({});
  const [loadingOriginalCode, setLoadingOriginalCode] = useState<Record<number, boolean>>({});

  // 리뷰 설정 상태
  const [reviewLanguage, setReviewLanguage] = useState(userSettings?.reviewLanguage || 'ko');
  const [reviewStyle, setReviewStyle] = useState(userSettings?.reviewStyle || 'detailed');
  const [analyzeCodebase, setAnalyzeCodebase] = useState(userSettings?.analyzeCodebase || false);

  const router = useRouter();

  // userSettings가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    if (userSettings) {
      setReviewLanguage(userSettings.reviewLanguage);
      setReviewStyle(userSettings.reviewStyle);
      setAnalyzeCodebase(userSettings.analyzeCodebase);
    }
  }, [userSettings]);

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
      // 먼저 설정 저장
      await saveSettings();

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
          files,
          additionalPrompt: additionalPrompt || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to generate review');

      const data = await response.json();
      setReview(data.review);
      setFileComments(data.fileComments || []);
      setHasGeneratedReview(true);
      setAdditionalPrompt(''); // 리뷰 생성 후 프롬프트 초기화
      setMessage('AI 리뷰가 생성되었습니다!');
    } catch (error) {
      console.error('Review generation error:', error);
      setMessage('리뷰 생성에 실패했습니다.');
    } finally {
      setReviewing(false);
    }
  };

  const handleRegenerate = () => {
    // 리뷰 초기화하여 생성 전 상태로 되돌리기
    setReview('');
    setFileComments([]);
    setHasGeneratedReview(false);
    setMessage('');
  };

  const handleEdit = () => {
    setEditedReview(review);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedReview.trim()) {
      setMessage('리뷰 내용은 비워둘 수 없습니다.');
      return;
    }
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
      setHasGeneratedReview(false);
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

    setFileComments([commentToAdd, ...fileComments]);
    setIsAddingComment(false);
    setNewComment({ filename: '', line: '', comment: '' });
    setMessage('새 코멘트가 추가되었습니다!');
  };

  const handleCancelNewComment = () => {
    setIsAddingComment(false);
    setNewComment({ filename: '', line: '', comment: '' });
  };

  // 드래그 앤 드롭 관련 상태 및 핸들러
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 드래그 중 미리보기용 배열 계산
  const previewComments = draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex
    ? (() => {
        const temp = [...fileComments];
        const draggedComment = temp[draggedIndex];
        temp.splice(draggedIndex, 1);
        temp.splice(dragOverIndex, 0, draggedComment);
        return temp;
      })()
    : fileComments;

  const handleDragStart = (index: number) => {
    if (editingCommentIndex !== null) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (editingCommentIndex !== null) return;
    if (draggedIndex === null) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    // 드래그 중에는 dragOverIndex를 유지
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (editingCommentIndex !== null) return;
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // 미리보기 배열을 실제 배열로 적용
    setFileComments(previewComments);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 터치 드래그 앤 드롭 핸들러
  const handleTouchStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (editingCommentIndex !== null) return;
    if (draggedIndex === null) return;

    const touch = e.touches[0];
    const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);

    if (!elementAtPoint) return;

    // 가장 가까운 드래그 가능한 항목 찾기
    const commentCard = elementAtPoint.closest('[data-comment-index]');
    if (commentCard) {
      const targetIndex = parseInt(commentCard.getAttribute('data-comment-index') || '-1');
      if (targetIndex !== -1) {
        setDragOverIndex(targetIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    if (editingCommentIndex !== null) return;
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // 미리보기 배열을 실제 배열로 적용
    setFileComments(previewComments);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 설정 저장 함수
  const saveSettings = async () => {
    try {
      // 기존 설정을 유지하면서 일부만 업데이트
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider: userSettings?.aiProvider,
          claudeApiKey: userSettings?.claudeApiKey,
          openaiApiKey: userSettings?.openaiApiKey,
          geminiApiKey: userSettings?.geminiApiKey,
          useMCP: userSettings?.useMCP,
          customPrompt: userSettings?.customPrompt,
          reviewLanguage,
          reviewStyle,
          analyzeCodebase
        })
      });

      if (!response.ok) throw new Error('Failed to update settings');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  // 원본 코드 가져오기 함수
  const handleToggleOriginalCode = async (commentId: number, commitId: string | undefined, filePath: string) => {

    // 이미 보고 있으면 토글해서 숨기기
    if (showingOriginalCode[commentId]) {
      setShowingOriginalCode(prev => ({ ...prev, [commentId]: false }));
      return;
    }

    // commit_id가 없으면 불가능
    if (!commitId) {
      alert('원본 코드 정보가 없습니다.');
      return;
    }

    // 이미 로드한 데이터가 있으면 재사용
    if (originalCodeData[commentId]) {
      setShowingOriginalCode(prev => ({ ...prev, [commentId]: true }));
      return;
    }

    // 로딩 시작
    setLoadingOriginalCode(prev => ({ ...prev, [commentId]: true }));

    try {
      // PR의 base 브랜치 참조 (예: main, master 등)
      const baseRef = pullRequest.base.ref;

      const response = await fetch(
        `/api/github/commit-diff?owner=${owner}&repo=${name}&commit=${commitId}&file=${encodeURIComponent(filePath)}&base=${encodeURIComponent(baseRef)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch original code');
      }

      const data = await response.json();

      // 데이터 저장
      setOriginalCodeData(prev => {
        const newData = { ...prev, [commentId]: data };
        return newData;
      });
      setShowingOriginalCode(prev => {
        const newState = { ...prev, [commentId]: true };
        return newState;
      });
    } catch (error) {
      console.error('Error fetching original code:', error);
      alert('원본 코드를 가져오는데 실패했습니다.');
    } finally {
      setLoadingOriginalCode(prev => ({ ...prev, [commentId]: false }));
    }
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
          {/* 왼쪽: 커밋 & 파일 변경사항 */}
          <div>
            {/* 커밋 목록 */}
            {commits.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  커밋 ({commits.length})
                </h2>
                <div className="space-y-2">
                  {commits.map((commit) => (
                    <a
                      key={commit.sha}
                      href={commit.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {commit.author && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={commit.author.avatar_url}
                            alt={commit.author.login}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                            {commit.commit.message.split('\n')[0]}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-mono">{commit.sha.substring(0, 7)}</span>
                            <span>•</span>
                            <span>
                              {commit.commit.author?.date
                                ? new Date(commit.commit.author.date).toLocaleDateString('ko-KR', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

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
                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
                    <span className="text-green-600 dark:text-green-400">+{file.additions}</span>
                    <span className="text-red-600 dark:text-red-400">-{file.deletions}</span>
                    <span>{file.changes} changes</span>
                  </div>
                  {file.patch && <CodeViewer file={file} />}
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
            {(githubReviews.length > 0 || githubReviewComments.some(c => !c.pull_request_review_id)) && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  기존 리뷰 ({githubReviews.length + (githubReviewComments.filter(c => !c.pull_request_review_id).length > 0 ? 1 : 0)})
                </h3>
                <div className="space-y-3">
                  {[...githubReviews].sort((a, b) =>
                    new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
                  ).map((review) => {
                    // 스레드 구성 함수: in_reply_to_id 기반으로 스레드를 만듦
                    const buildThreads = (allComments: typeof githubReviewComments) => {
                      // Top-level 코멘트 찾기 (답글이 아닌 것)
                      const topLevel = allComments.filter(c => !c.in_reply_to_id);

                      // 각 top-level 코멘트에 대해 스레드 구성
                      return topLevel.map(topComment => {
                        const thread = [topComment];

                        // 이 코멘트의 답글들을 재귀적으로 찾기 (전체 코멘트에서 찾음)
                        const findReplies = (parentId: number): typeof githubReviewComments => {
                          const replies = allComments.filter(c => c.in_reply_to_id === parentId);
                          // 시간순 정렬
                          replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                          const allReplies: typeof githubReviewComments = [];
                          for (const reply of replies) {
                            allReplies.push(reply);
                            // 재귀적으로 답글의 답글 찾기
                            allReplies.push(...findReplies(reply.id));
                          }
                          return allReplies;
                        };

                        thread.push(...findReplies(topComment.id));
                        return thread;
                      });
                    };

                    // 이 리뷰에 속한 스레드 찾기 (최상위 코멘트의 review_id 기준)
                    const allThreads = buildThreads(githubReviewComments);
                    const reviewThreads = allThreads.filter(thread =>
                      thread[0].pull_request_review_id === review.id
                    );

                    // 리뷰 본문도 없고 라인 코멘트도 없으면 건너뛰기
                    if (!review.body && reviewThreads.length === 0 && review.state === 'COMMENTED') {
                      return null;
                    }

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
                            {reviewThreads.length > 0 && (
                              <div className="mt-3 space-y-4 pl-1">
                                {(() => {
                                  // 스레드를 최신 코멘트 기준으로 정렬 (최신이 아래로)
                                  const sortedThreads = [...reviewThreads].sort((a, b) => {
                                    const latestA = a[a.length - 1];
                                    const latestB = b[b.length - 1];
                                    return new Date(latestA.created_at).getTime() - new Date(latestB.created_at).getTime();
                                  });

                                  return sortedThreads.map((comments) => {
                                    const firstComment = comments[0];
                                    const file = files.find(f => f.filename === firstComment.path);

                                    // GitHub API 기준: line이 없고 original_line이 있으면 outdated
                                    const isOutdated = !firstComment.line && !!firstComment.original_line;

                                    return (
                                      <div key={firstComment.id} className="bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-200 dark:border-purple-800 p-3">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs font-mono">
                                            <FaCode className="text-xs" />
                                            {firstComment.path}
                                          </span>
                                          {(firstComment.line || firstComment.original_line) && (
                                            <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                                              Line {firstComment.line || firstComment.original_line}
                                            </span>
                                          )}
                                          {isOutdated && (
                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded text-xs font-medium">
                                              Outdated
                                            </span>
                                          )}
                                          {/* 원본 코드 보기 버튼 */}
                                          {(firstComment.original_commit_id || firstComment.commit_id) && (
                                            <button
                                              onClick={() => handleToggleOriginalCode(
                                                firstComment.id,
                                                firstComment.original_commit_id || firstComment.commit_id,
                                                firstComment.path
                                              )}
                                              disabled={loadingOriginalCode[firstComment.id]}
                                              className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              {loadingOriginalCode[firstComment.id] ? (
                                                <span className="flex items-center gap-1">
                                                  <FaSpinner className="animate-spin text-xs" />
                                                  로딩 중...
                                                </span>
                                              ) : showingOriginalCode[firstComment.id] ? (
                                                '현재 코드 보기'
                                              ) : (
                                                '원본 코드 보기'
                                              )}
                                            </button>
                                          )}
                                        </div>

                                        {/* Outdated 경고 메시지 */}
                                        {isOutdated && !showingOriginalCode[firstComment.id] && (
                                          <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                                            <p className="font-medium mb-1">⚠️ 이 코멘트는 오래되었습니다</p>
                                            <p className="text-amber-700 dark:text-amber-300">
                                              원본 코드 보기 버튼을 눌러 코멘트 작성 시점의 코드를 확인하세요.
                                            </p>
                                          </div>
                                        )}

                                        {/* 코드 뷰어 - 첫 코멘트 기준으로만 표시 */}
                                        {(() => {
                                          // 원본 코드 표시 모드인지 확인
                                          const showingOriginal = showingOriginalCode[firstComment.id];
                                          const originalData = originalCodeData[firstComment.id];

                                          // 원본 코드를 보고 있는 경우
                                          if (showingOriginal && originalData) {
                                            return (
                                              <div className="mb-4">
                                                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-200">
                                                  📜 코멘트가 작성된 시점의 원본 코드를 보고 있습니다
                                                </div>
                                                <PlainFileViewer
                                                  content={originalData.content}
                                                  targetLine={firstComment.original_line || firstComment.line}
                                                />
                                              </div>
                                            );
                                          }

                                          // 현재 PR 코드를 보고 있는 경우 (outdated가 아닐 때만)
                                          if (!isOutdated && file && file.patch) {
                                            return (
                                              <div className="mb-4">
                                                <CodeViewer
                                                  file={file}
                                                  targetLine={firstComment.line}
                                                />
                                              </div>
                                            );
                                          }

                                          // outdated이고 원본 코드도 안 보고 있는 경우
                                          if (isOutdated && !showingOriginal) {
                                            return null; // 경고 메시지만 표시
                                          }

                                          return (
                                            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500 dark:text-gray-400">
                                              코드 미리보기를 사용할 수 없습니다.
                                              {!file && ' (파일을 찾을 수 없습니다)'}
                                            </div>
                                          );
                                        })()}

                                        {/* 코멘트 스레드 */}
                                        <div className="space-y-3">
                                          {comments.map((comment) => (
                                            <div key={comment.id}>
                                              <div className="flex items-start gap-2 mb-1">
                                                {comment.user && (
                                                  /* eslint-disable-next-line @next/next/no-img-element */
                                                  <img
                                                    src={comment.user.avatar_url}
                                                    alt={comment.user.login}
                                                    className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
                                                  />
                                                )}
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                                                      {comment.user?.login || 'Unknown'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                      {new Date(comment.created_at).toLocaleDateString('ko-KR', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                      })}
                                                    </span>
                                                  </div>
                                                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                    {comment.body}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
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

                  {/* 독립 리뷰 코멘트 (리뷰에 속하지 않은 것들) */}
                  {(() => {
                    const standaloneComments = githubReviewComments.filter(c => !c.pull_request_review_id);
                    if (standaloneComments.length === 0) return null;

                    // 스레드 구성 함수
                    const buildThreads = (comments: typeof standaloneComments) => {
                      const topLevel = comments.filter(c => !c.in_reply_to_id);
                      return topLevel.map(topComment => {
                        const thread = [topComment];
                        const findReplies = (parentId: number): typeof standaloneComments => {
                          const replies = comments.filter(c => c.in_reply_to_id === parentId);
                          replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                          const allReplies: typeof standaloneComments = [];
                          for (const reply of replies) {
                            allReplies.push(reply);
                            allReplies.push(...findReplies(reply.id));
                          }
                          return allReplies;
                        };
                        thread.push(...findReplies(topComment.id));
                        return thread;
                      });
                    };

                    const threads = buildThreads(standaloneComments);
                    threads.sort((a, b) => {
                      const latestA = a[a.length - 1];
                      const latestB = b[b.length - 1];
                      return new Date(latestA.created_at).getTime() - new Date(latestB.created_at).getTime();
                    });

                    return (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <FaComment className="text-gray-500 dark:text-gray-400 text-sm" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-medium text-gray-900 dark:text-white text-sm">
                                라인별 코멘트
                              </span>
                              <span className="px-2 py-0.5 text-xs rounded flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                <FaComment className="text-xs" />
                                코멘트
                              </span>
                            </div>

                            <div className="space-y-2 pl-3 border-l-2 border-purple-200 dark:border-purple-800">
                              {threads.map((comments) => {
                                const firstComment = comments[0];
                                const file = files.find(f => f.filename === firstComment.path);
                                const isOutdated = !firstComment.line && !!firstComment.original_line;

                                return (
                                  <div key={firstComment.id} className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs font-mono">
                                        <FaCode className="text-xs" />
                                        {firstComment.path}
                                      </span>
                                      {(firstComment.line || firstComment.original_line) && (
                                        <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                                          Line {firstComment.line || firstComment.original_line}
                                        </span>
                                      )}
                                      {isOutdated && (
                                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded text-xs font-medium">
                                          Outdated
                                        </span>
                                      )}
                                      {/* 원본 코드 보기 버튼 */}
                                      {(firstComment.original_commit_id || firstComment.commit_id) && (
                                        <button
                                          onClick={() => handleToggleOriginalCode(
                                            firstComment.id,
                                            firstComment.original_commit_id || firstComment.commit_id,
                                            firstComment.path
                                          )}
                                          disabled={loadingOriginalCode[firstComment.id]}
                                          className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {loadingOriginalCode[firstComment.id] ? (
                                            <span className="flex items-center gap-1">
                                              <FaSpinner className="animate-spin text-xs" />
                                              로딩 중...
                                            </span>
                                          ) : showingOriginalCode[firstComment.id] ? (
                                            '현재 코드 보기'
                                          ) : (
                                            '원본 코드 보기'
                                          )}
                                        </button>
                                      )}
                                    </div>

                                    {isOutdated && !showingOriginalCode[firstComment.id] && (
                                      <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                                        <p className="font-medium mb-1">⚠️ 이 코멘트는 오래되었습니다</p>
                                        <p className="text-amber-700 dark:text-amber-300">
                                          원본 코드 보기 버튼을 눌러 코멘트 작성 시점의 코드를 확인하세요.
                                        </p>
                                      </div>
                                    )}

                                    {/* 코드 뷰어 - 첫 코멘트 기준으로만 표시 */}
                                    {(() => {
                                      // 원본 코드 표시 모드인지 확인
                                      const showingOriginal = showingOriginalCode[firstComment.id];
                                      const originalData = originalCodeData[firstComment.id];

                                      // 원본 코드를 보고 있는 경우
                                      if (showingOriginal && originalData) {
                                        return (
                                          <div className="mb-4">
                                            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-200">
                                              📜 코멘트가 작성된 시점의 원본 코드를 보고 있습니다
                                            </div>
                                            <PlainFileViewer
                                              content={originalData.content}
                                              targetLine={firstComment.original_line || firstComment.line}
                                            />
                                          </div>
                                        );
                                      }

                                      // 현재 PR 코드를 보고 있는 경우 (outdated가 아닐 때만)
                                      if (!isOutdated && file && file.patch) {
                                        return (
                                          <div className="mb-4">
                                            <CodeViewer
                                              file={file}
                                              targetLine={firstComment.line}
                                            />
                                          </div>
                                        );
                                      }

                                      // outdated이고 원본 코드도 안 보고 있는 경우
                                      if (isOutdated && !showingOriginal) {
                                        return null; // 경고 메시지만 표시
                                      }

                                      return (
                                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500 dark:text-gray-400">
                                          코드 미리보기를 사용할 수 없습니다.
                                          {!file && ' (파일을 찾을 수 없습니다)'}
                                        </div>
                                      );
                                    })()}

                                    {/* 코멘트 스레드 */}
                                    <div className="space-y-3">
                                      {comments.map((comment, idx) => (
                                        <div key={comment.id} className={idx > 0 ? 'pl-3 border-l-2 border-gray-300 dark:border-gray-600' : ''}>
                                          <div className="flex items-start gap-2 mb-1">
                                            {comment.user && (
                                              /* eslint-disable-next-line @next/next/no-img-element */
                                              <img
                                                src={comment.user.avatar_url}
                                                alt={comment.user.login}
                                                className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
                                              />
                                            )}
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                                  {comment.user?.login || 'Unknown'}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                  {new Date(comment.created_at).toLocaleDateString('ko-KR', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                  })}
                                                </span>
                                              </div>
                                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {comment.body}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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

              {!hasGeneratedReview ? (
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

                          {/* 리뷰 설정 */}
                          <div className="mb-6 text-left space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  리뷰 언어
                                </label>
                                <select
                                  value={reviewLanguage}
                                  onChange={(e) => setReviewLanguage(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="ko">한국어</option>
                                  <option value="en">English</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  리뷰 스타일
                                </label>
                                <select
                                  value={reviewStyle}
                                  onChange={(e) => setReviewStyle(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="brief">간략</option>
                                  <option value="detailed">상세</option>
                                  <option value="strict">엄격</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                              <input
                                type="checkbox"
                                id="analyzeCodebase"
                                checked={analyzeCodebase}
                                onChange={(e) => setAnalyzeCodebase(e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500"
                              />
                              <label htmlFor="analyzeCodebase" className="text-xs text-gray-900 dark:text-white cursor-pointer">
                                <span className="font-semibold">코드베이스 전반 분석</span>
                                <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                                  레포지토리 전체 구조와 코딩 컨벤션을 분석 (토큰 사용량 증가)
                                </p>
                              </label>
                            </div>
                          </div>

                          {/* 추가 프롬프트 입력 */}
                          <div className="mb-6 text-left">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              추가 프롬프트 (선택사항)
                            </label>
                            <textarea
                              value={additionalPrompt}
                              onChange={(e) => setAdditionalPrompt(e.target.value)}
                              placeholder="예: 성능 최적화에 초점을 맞춰서 리뷰해줘&#10;예: 보안 취약점을 중점적으로 확인해줘"
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            />
                          </div>

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

                        {previewComments.map((comment, idx) => {
                          // 원본 배열에서의 인덱스 찾기
                          const originalIdx = fileComments.indexOf(comment);

                          return (
                            <div key={originalIdx !== -1 ? originalIdx : idx}>
                              {editingCommentIndex === originalIdx ? (
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
                              <div
                                draggable
                                data-comment-index={idx}
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={(e) => handleDrop(e)}
                                onDragLeave={handleDragLeave}
                                onDragEnd={handleDragEnd}
                                onTouchStart={() => handleTouchStart(idx)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                className={`rounded-lg p-3 border cursor-move transition-all touch-none ${
                                  dragOverIndex === idx && draggedIndex !== null
                                  ? 'bg-purple-100 dark:bg-purple-800/40 border-purple-400 dark:border-purple-500 shadow-lg'
                                  : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-mono text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                        <FaCode className="text-xs" />
                                        {comment.filename}
                                      </span>
                                      {comment.line && (
                                        <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                                          Line {comment.line}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                      {comment.comment}
                                    </p>

                                    {/* 인라인 코드 뷰어 - 항상 열려있음 */}
                                    {(() => {
                                      const file = files.find(f => f.filename === comment.filename);
                                      if (!file || !file.patch) {
                                        return (
                                          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500 dark:text-gray-400">
                                            코드 미리보기를 사용할 수 없습니다.
                                          </div>
                                        );
                                      }

                                      return <CodeViewer file={file} targetLine={comment.line} />;
                                    })()}
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
                          );
                        })}

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
                          onClick={handleRegenerate}
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
