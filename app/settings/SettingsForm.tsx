'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

type Settings = {
  aiProvider: string;
  claudeApiKey: string | null;
  openaiApiKey: string | null;
  geminiApiKey: string | null;
  useMCP: boolean;
  mcpServerCommand: string | null;
  mcpServerArgs: string | null;
  mcpServerEnv: string | null;
  customPrompt: string | null;
  reviewLanguage: string;
  reviewStyle: string;
} | null;

export default function SettingsForm({
  settings
}: {
  user: { id: string; name: string | null };
  settings: Settings;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    aiProvider: settings?.aiProvider || 'claude',
    claudeApiKey: settings?.claudeApiKey || '',
    openaiApiKey: settings?.openaiApiKey || '',
    geminiApiKey: settings?.geminiApiKey || '',
    useMCP: settings?.useMCP || false,
    mcpServerCommand: settings?.mcpServerCommand || '',
    mcpServerArgs: settings?.mcpServerArgs || '',
    mcpServerEnv: settings?.mcpServerEnv || '',
    customPrompt: settings?.customPrompt || '',
    reviewLanguage: settings?.reviewLanguage || 'ko',
    reviewStyle: settings?.reviewStyle || 'detailed'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setMessage('설정이 저장되었습니다!');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch {
      setMessage('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <FaArrowLeft />
            대시보드로 돌아가기
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">설정</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* MCP 사용 여부 */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <input
                type="checkbox"
                id="useMCP"
                checked={formData.useMCP}
                onChange={(e) =>
                  setFormData({ ...formData, useMCP: e.target.checked })
                }
                className="w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="useMCP" className="text-sm text-gray-900 dark:text-white">
                <span className="font-semibold">MCP (Model Context Protocol) 사용</span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  MCP 서버를 통해 AI와 통신합니다. MCP를 사용하면 API 키가 필요하지 않습니다.
                </p>
              </label>
            </div>

            {/* AI Provider 선택 - MCP 사용 시에도 표시 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Provider {formData.useMCP && <span className="text-xs text-gray-500 dark:text-gray-400">(MCP 서버가 사용할 AI 모델)</span>}
              </label>
              <select
                value={formData.aiProvider}
                onChange={(e) =>
                  setFormData({ ...formData, aiProvider: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="claude">Claude (Anthropic)</option>
                <option value="openai">GPT-4 (OpenAI)</option>
                <option value="gemini">Gemini (Google)</option>
              </select>
              {formData.useMCP && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  선택한 AI Provider는 MCP 서버가 실제로 사용할 모델을 나타냅니다. MCP 서버 설정에서 해당 모델의 API 키를 환경 변수로 제공해야 합니다.
                </p>
              )}
            </div>

            {/* MCP 설정 (useMCP가 true일 때만 표시) */}
            {formData.useMCP && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">MCP 서버 설정</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    MCP 서버 명령어
                  </label>
                  <input
                    type="text"
                    value={formData.mcpServerCommand}
                    onChange={(e) =>
                      setFormData({ ...formData, mcpServerCommand: e.target.value })
                    }
                    placeholder="npx -y @modelcontextprotocol/server-claude"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    MCP 서버를 실행할 명령어 (예: npx, node, python 등)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    서버 인자 (JSON 배열)
                  </label>
                  <input
                    type="text"
                    value={formData.mcpServerArgs}
                    onChange={(e) =>
                      setFormData({ ...formData, mcpServerArgs: e.target.value })
                    }
                    placeholder='["--arg1", "value1"]'
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    선택사항: 서버 실행 시 전달할 인자들 (JSON 배열 형식)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    환경 변수 (JSON 객체)
                  </label>
                  <textarea
                    value={formData.mcpServerEnv}
                    onChange={(e) =>
                      setFormData({ ...formData, mcpServerEnv: e.target.value })
                    }
                    placeholder='{"ANTHROPIC_API_KEY": "sk-ant-..."}'
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    선택사항: MCP 서버에 전달할 환경 변수 (JSON 객체 형식)
                  </p>
                </div>
              </div>
            )}

            {/* API Keys */}
            {!formData.useMCP && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h3>

              {formData.aiProvider === 'claude' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Claude API Key
                  </label>
                  <input
                    type="password"
                    value={formData.claudeApiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, claudeApiKey: e.target.value })
                    }
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    https://console.anthropic.com 에서 발급받을 수 있습니다
                  </p>
                </div>
              )}

              {formData.aiProvider === 'openai' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={formData.openaiApiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, openaiApiKey: e.target.value })
                    }
                    placeholder="sk-..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    https://platform.openai.com 에서 발급받을 수 있습니다
                  </p>
                </div>
              )}

              {formData.aiProvider === 'gemini' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={formData.geminiApiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, geminiApiKey: e.target.value })
                    }
                    placeholder="AIza..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    https://makersuite.google.com/app/apikey 에서 발급받을 수
                    있습니다
                  </p>
                </div>
              )}
              </div>
            )}

            {/* 리뷰 설정 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">리뷰 설정</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  리뷰 언어
                </label>
                <select
                  value={formData.reviewLanguage}
                  onChange={(e) =>
                    setFormData({ ...formData, reviewLanguage: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  리뷰 스타일
                </label>
                <select
                  value={formData.reviewStyle}
                  onChange={(e) =>
                    setFormData({ ...formData, reviewStyle: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="brief">간단하게</option>
                  <option value="detailed">상세하게</option>
                  <option value="strict">엄격하게</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  커스텀 프롬프트 (선택사항)
                </label>
                <textarea
                  value={formData.customPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, customPrompt: e.target.value })
                  }
                  rows={4}
                  placeholder="추가로 AI에게 전달할 지시사항을 입력하세요..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex items-center justify-between pt-6">
              <div>
                {message && (
                  <span
                    className={`text-sm ${
                      message.includes('실패')
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {message}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaSave />
                {saving ? '저장 중...' : '설정 저장'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
