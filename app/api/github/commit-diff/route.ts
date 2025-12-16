import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Octokit } from '@octokit/rest';
import { userQueries } from '@/lib/db/sqlite';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userQueries.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const commitSha = searchParams.get('commit');
    const filePath = searchParams.get('file');

    if (!owner || !repo || !commitSha || !filePath) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, commit, file' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: user.access_token,
    });

    // 해당 커밋 시점의 파일 내용 가져오기
    const { data: fileContent } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: commitSha,
    });

    if (Array.isArray(fileContent) || fileContent.type !== 'file') {
      return NextResponse.json(
        { error: 'Path is not a file' },
        { status: 400 }
      );
    }

    const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

    return NextResponse.json({
      filename: filePath,
      content: content,
      commitSha: commitSha,
    });
  } catch (error) {
    console.error('Error fetching commit diff:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commit diff' },
      { status: 500 }
    );
  }
}