import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // FORCE_HTTPS 환경 변수가 true인 경우 HTTPS 강제
  const forceHttps = process.env.FORCE_HTTPS === 'true';

  if (forceHttps) {
    const proto = request.headers.get('x-forwarded-proto');

    // HTTP 요청이면 HTTPS로 리다이렉트
    if (proto === 'http') {
      const url = request.nextUrl.clone();
      url.protocol = 'https:';
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

// 모든 경로에 대해 미들웨어 실행
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};