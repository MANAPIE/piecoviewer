'use client';

import { signIn } from 'next-auth/react';
import { FaGithub } from 'react-icons/fa';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="w-full max-w-md px-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              PIEcoviewer
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              AI 기반 GitHub PR 코드 리뷰 도구
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg px-6 py-3 font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            >
              <FaGithub className="text-xl" />
              GitHub로 로그인
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>로그인하면 다음 권한에 동의하게 됩니다:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• 프로필 정보 읽기</li>
              <li>• 저장소 접근</li>
              <li>• PR 코멘트 작성</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
