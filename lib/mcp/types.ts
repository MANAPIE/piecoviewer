export type MCPConnectionType = 'stdio' | 'sse';

export interface MCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface MCPReviewRequest {
  owner: string;
  repo: string;
  prNumber: number;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  pullRequest: {
    title: string;
    body: string | null;
  };
  customPrompt?: string;
}

export interface MCPReviewResponse {
  success: boolean;
  review?: string;
  error?: string;
}