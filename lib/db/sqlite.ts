import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Types
export interface User {
  id: string;
  github_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  access_token: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  user_id: string;
  ai_provider: string;
  claude_api_key: string | null;
  openai_api_key: string | null;
  gemini_api_key: string | null;
  use_mcp: number;
  mcp_server_command: string | null;
  mcp_server_args: string | null;
  mcp_server_env: string | null;
  custom_prompt: string | null;
  review_language: string;
  review_style: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  repo_owner: string;
  repo_name: string;
  pr_number: number;
  review_content: string;
  file_comments: string;
  ai_provider: string;
  is_posted: number;
  created_at: string;
  updated_at: string;
}

// 데이터 디렉토리 생성
const dataDir = process.env.DATABASE_PATH
  ? path.dirname(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'app.db');
const db = new Database(dbPath);

// 테이블 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    github_id TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    access_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    ai_provider TEXT DEFAULT 'claude',
    claude_api_key TEXT,
    openai_api_key TEXT,
    gemini_api_key TEXT,
    use_mcp INTEGER DEFAULT 0,
    mcp_server_command TEXT,
    mcp_server_args TEXT,
    mcp_server_env TEXT,
    custom_prompt TEXT,
    review_language TEXT DEFAULT 'ko',
    review_style TEXT DEFAULT 'detailed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    pr_number INTEGER NOT NULL,
    review_content TEXT,
    file_comments TEXT,
    ai_provider TEXT,
    is_posted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_repo ON reviews(repo_owner, repo_name, pr_number);
`);

// WAL 모드 활성화 (성능 향상)
db.pragma('journal_mode = WAL');

export default db;

// 사용자 관련 쿼리
export const userQueries = {
  findByEmail: (email: string): User | undefined => {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  },

  findByGithubId: (githubId: string): User | undefined => {
    return db.prepare('SELECT * FROM users WHERE github_id = ?').get(githubId) as User | undefined;
  },

  upsert: (data: {
    githubId: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
    accessToken: string;
  }) => {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return db.prepare(`
      INSERT INTO users (id, github_id, name, email, avatar_url, access_token)
      VALUES (@id, @githubId, @name, @email, @avatarUrl, @accessToken)
      ON CONFLICT(github_id) DO UPDATE SET
        name = @name,
        email = @email,
        avatar_url = @avatarUrl,
        access_token = @accessToken,
        updated_at = CURRENT_TIMESTAMP
    `).run({
      id,
      githubId: data.githubId,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl,
      accessToken: data.accessToken
    });
  }
};

// 설정 관련 쿼리
export const settingsQueries = {
  findByUserId: (userId: string): Settings | undefined => {
    return db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId) as Settings | undefined;
  },

  upsert: (userId: string, data: {
    aiProvider?: string;
    claudeApiKey?: string;
    openaiApiKey?: string;
    geminiApiKey?: string;
    useMCP?: boolean;
    mcpServerCommand?: string;
    mcpServerArgs?: string;
    mcpServerEnv?: string;
    customPrompt?: string;
    reviewLanguage?: string;
    reviewStyle?: string;
  }) => {
    return db.prepare(`
      INSERT INTO settings (
        user_id, ai_provider, claude_api_key, openai_api_key, gemini_api_key,
        use_mcp, mcp_server_command, mcp_server_args, mcp_server_env,
        custom_prompt, review_language, review_style
      )
      VALUES (
        @userId, @aiProvider, @claudeApiKey, @openaiApiKey, @geminiApiKey,
        @useMcp, @mcpServerCommand, @mcpServerArgs, @mcpServerEnv,
        @customPrompt, @reviewLanguage, @reviewStyle
      )
      ON CONFLICT(user_id) DO UPDATE SET
        ai_provider = @aiProvider,
        claude_api_key = @claudeApiKey,
        openai_api_key = @openaiApiKey,
        gemini_api_key = @geminiApiKey,
        use_mcp = @useMcp,
        mcp_server_command = @mcpServerCommand,
        mcp_server_args = @mcpServerArgs,
        mcp_server_env = @mcpServerEnv,
        custom_prompt = @customPrompt,
        review_language = @reviewLanguage,
        review_style = @reviewStyle,
        updated_at = CURRENT_TIMESTAMP
    `).run({
      userId,
      aiProvider: data.aiProvider || 'claude',
      claudeApiKey: data.claudeApiKey || null,
      openaiApiKey: data.openaiApiKey || null,
      geminiApiKey: data.geminiApiKey || null,
      useMcp: data.useMCP ? 1 : 0,
      mcpServerCommand: data.mcpServerCommand || null,
      mcpServerArgs: data.mcpServerArgs || null,
      mcpServerEnv: data.mcpServerEnv || null,
      customPrompt: data.customPrompt || null,
      reviewLanguage: data.reviewLanguage || 'ko',
      reviewStyle: data.reviewStyle || 'detailed'
    });
  }
};

// 리뷰 관련 쿼리
export const reviewQueries = {
  findByUserId: (userId: string, limit = 10): Review[] => {
    return db.prepare(`
      SELECT * FROM reviews
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit) as Review[];
  },

  findByPR: (userId: string, repoOwner: string, repoName: string, prNumber: number): Review[] => {
    return db.prepare(`
      SELECT * FROM reviews
      WHERE user_id = ?
        AND repo_owner = ?
        AND repo_name = ?
        AND pr_number = ?
      ORDER BY created_at DESC
    `).all(userId, repoOwner, repoName, prNumber) as Review[];
  },

  findUnposted: (userId: string, repoOwner: string, repoName: string, prNumber: number): Review | undefined => {
    return db.prepare(`
      SELECT * FROM reviews
      WHERE user_id = ?
        AND repo_owner = ?
        AND repo_name = ?
        AND pr_number = ?
        AND is_posted = 0
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId, repoOwner, repoName, prNumber) as Review | undefined;
  },

  create: (data: {
    userId: string;
    repoOwner: string;
    repoName: string;
    prNumber: number;
    reviewContent: string;
    fileComments: string;
    aiProvider: string;
  }) => {
    const id = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO reviews (
        id, user_id, repo_owner, repo_name, pr_number,
        review_content, file_comments, ai_provider, is_posted
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      data.userId,
      data.repoOwner,
      data.repoName,
      data.prNumber,
      data.reviewContent,
      data.fileComments,
      data.aiProvider
    );
    return { id };
  },

  update: (reviewId: string, reviewContent: string, fileComments: string) => {
    return db.prepare(`
      UPDATE reviews
      SET review_content = ?,
          file_comments = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reviewContent, fileComments, reviewId);
  },

  markAsPosted: (reviewId: string) => {
    return db.prepare(`
      UPDATE reviews
      SET is_posted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reviewId);
  },

  updateIsPosted: (userId: string, repoOwner: string, repoName: string, prNumber: number, isPosted: boolean) => {
    return db.prepare(`
      UPDATE reviews
      SET is_posted = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND repo_owner = ?
        AND repo_name = ?
        AND pr_number = ?
    `).run(isPosted ? 1 : 0, userId, repoOwner, repoName, prNumber);
  }
};