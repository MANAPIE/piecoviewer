import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { userQueries, settingsQueries, reviewQueries } from '@/lib/db/sqlite';
import { getAIProvider } from '@/lib/ai';
import { Octokit } from '@octokit/rest';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userQueries.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const settings = settingsQueries.findByUserId(user.id);

    if (!settings) {
      return NextResponse.json(
        { error: 'User settings not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { owner, repo, prNumber, pullRequest, files } = body as {
      owner: string;
      repo: string;
      prNumber: number;
      pullRequest: { title: string; body: string | null };
      files: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch?: string;
      }>;
    };

    // 코드베이스 분석 옵션이 활성화되어 있으면 레포지토리 구조 가져오기
    let codebaseContext = '';
    if (settings.analyze_codebase === 1) {
      try {
        const octokit = new Octokit({ auth: user.access_token });

        // 레포지토리 기본 정보
        const repoInfo = await octokit.repos.get({ owner, repo });

        // 레포지토리 트리 구조 가져오기 (루트 레벨)
        const tree = await octokit.git.getTree({
          owner,
          repo,
          tree_sha: 'HEAD',
          recursive: '1' // 전체 트리 구조
        });

        // 주요 파일들 (README, 설정 파일 등) 내용 가져오기
        const importantFiles = ['README.md', 'package.json', 'tsconfig.json', '.eslintrc', '.prettierrc'];
        const fileContents: Record<string, string> = {};

        for (const file of importantFiles) {
          try {
            const content = await octokit.repos.getContent({
              owner,
              repo,
              path: file
            });

            if ('content' in content.data && typeof content.data.content === 'string') {
              fileContents[file] = Buffer.from(content.data.content, 'base64').toString('utf-8');
            }
          } catch {
            // 파일이 없으면 무시
          }
        }

        // 코드베이스 컨텍스트 생성
        codebaseContext = `
## Repository Context

**Repository:** ${repoInfo.data.full_name}
**Description:** ${repoInfo.data.description || 'N/A'}
**Primary Language:** ${repoInfo.data.language || 'N/A'}

### Project Structure
\`\`\`
${tree.data.tree.slice(0, 100).map(item => `${item.type === 'tree' ? '📁' : '📄'} ${item.path}`).join('\n')}
${tree.data.tree.length > 100 ? `... and ${tree.data.tree.length - 100} more files` : ''}
\`\`\`

${Object.entries(fileContents).map(([filename, content]) => `
### ${filename}
\`\`\`
${content.slice(0, 1000)}${content.length > 1000 ? '\n... (truncated)' : ''}
\`\`\`
`).join('\n')}

Please analyze this PR in the context of the overall codebase structure and coding conventions used in this project.
`;
      } catch (error) {
        console.error('Failed to fetch codebase context:', error);
        // 에러가 나도 리뷰는 계속 진행
      }
    }

    // AI Provider 설정
    const aiProvider = getAIProvider(settings.ai_provider);

    // API 키 설정
    const apiKey =
      settings.ai_provider === 'claude'
        ? settings.claude_api_key
        : settings.ai_provider === 'openai'
        ? settings.openai_api_key
        : settings.gemini_api_key;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 400 }
      );
    }

    aiProvider.setApiKey(apiKey);

    // Diff 생성
    const diff = files
      .map((file) => {
        return `--- a/${file.filename}
+++ b/${file.filename}
${file.patch || ''}`;
      })
      .join('\n\n');

    // AI 리뷰 생성
    const result = await aiProvider.review(diff, {
      prTitle: pullRequest.title,
      prDescription: pullRequest.body || '',
      fileChanges: files.map((f) => ({
        filename: f.filename,
        status: f.status as 'added' | 'modified' | 'removed',
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch
      })),
      customPrompt: settings.custom_prompt
        ? (codebaseContext ? `${codebaseContext}\n\n${settings.custom_prompt}` : settings.custom_prompt)
        : (codebaseContext || undefined),
      reviewLanguage: settings.review_language,
      reviewStyle: settings.review_style
    });

    // PIEcoviewer 푸터 추가
    const piecoviewerUrl = process.env.PIECOVIEWER_URL || 'https://github.com/yourusername/piecoviewer';
    const reviewWithFooter = `${result.summary}\n\n---\n*🤖 Generated by [PIEcoviewer](${piecoviewerUrl})*`;

    // 리뷰 결과를 DB에 저장
    const review = reviewQueries.create({
      userId: user.id,
      repoOwner: owner,
      repoName: repo,
      prNumber,
      reviewContent: reviewWithFooter,
      fileComments: JSON.stringify(result.fileComments),
      aiProvider: settings.ai_provider
    });

    return NextResponse.json({
      success: true,
      review: reviewWithFooter,
      reviewId: review.id,
      fileComments: result.fileComments
    });
  } catch (error) {
    console.error('AI review error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate review';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}