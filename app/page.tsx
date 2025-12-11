import Link from 'next/link';
import { FaGithub, FaRobot, FaCheckCircle, FaBolt } from 'react-icons/fa';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* 헤더 */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-white text-2xl font-bold">PIEcoviewer</div>
          <Link
            href="/login"
            className="bg-white text-purple-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            로그인
          </Link>
        </nav>
      </header>

      {/* 히어로 섹션 */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            AI 기반 GitHub PR
            <br />
            코드 리뷰 자동화
          </h1>
          <p className="text-xl text-purple-100 mb-12">
            Claude, GPT, Gemini를 활용한 스마트한 코드 리뷰로
            <br />
            개발 생산성을 높이세요
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 bg-white text-purple-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            <FaGithub className="text-2xl" />
            GitHub로 시작하기
          </Link>
        </div>

        {/* 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-white">
            <FaRobot className="text-4xl mb-4 text-purple-300" />
            <h3 className="text-xl font-semibold mb-3">다양한 AI 지원</h3>
            <p className="text-purple-100">
              Claude, GPT-4, Gemini 중 원하는 AI 모델을 선택하여 코드 리뷰를 받을 수 있습니다
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-white">
            <FaBolt className="text-4xl mb-4 text-yellow-300" />
            <h3 className="text-xl font-semibold mb-3">빠른 리뷰</h3>
            <p className="text-purple-100">
              PR이 생성되면 즉시 AI가 분석하여 상세한 피드백을 제공합니다
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-white">
            <FaCheckCircle className="text-4xl mb-4 text-green-300" />
            <h3 className="text-xl font-semibold mb-3">품질 향상</h3>
            <p className="text-purple-100">
              버그, 보안 이슈, 코드 스타일까지 꼼꼼하게 검토하여 코드 품질을 높입니다
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-24">
          <p className="text-purple-100 mb-4">
            프라이빗 저장소도 지원합니다
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-purple-200">
            <FaCheckCircle />
            <span>무료로 시작 • GitHub OAuth로 안전하게</span>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-purple-800">
        <div className="text-center text-purple-200 text-sm">
          <p>© 2025 PIEcoviewer. AI-powered Code Review Tool.</p>
        </div>
      </footer>
    </div>
  );
}
