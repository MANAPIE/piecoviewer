import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPServerConfig, MCPReviewRequest, MCPReviewResponse } from './types';
import { z } from 'zod';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(config: MCPServerConfig): Promise<void> {
    if (!config.command) {
      throw new Error('MCP server command is required');
    }

    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: {
        ...(process.env as Record<string, string>),
        ...(config.env || {})
      } as Record<string, string>
    });

    this.client = new Client(
      {
        name: 'piecoviewer-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    await this.client.connect(this.transport);
  }

  async requestReview(request: MCPReviewRequest): Promise<MCPReviewResponse> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      // MCP 서버에 리뷰 요청
      const result = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name: 'review_pull_request',
            arguments: {
              owner: request.owner,
              repo: request.repo,
              pr_number: request.prNumber,
              files: request.files,
              pull_request: request.pullRequest,
              custom_prompt: request.customPrompt
            }
          }
        },
        z.object({
          content: z.array(z.object({ text: z.string().optional() })).optional()
        })
      );

      return {
        success: true,
        review: result.content?.[0]?.text || ''
      };
    } catch (error) {
      console.error('MCP request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async listTools(): Promise<string[]> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.request(
        {
          method: 'tools/list',
          params: {}
        },
        z.object({
          tools: z.array(z.object({ name: z.string() })).optional()
        })
      );

      return result.tools?.map(tool => tool.name) || [];
    } catch (error) {
      console.error('MCP list tools error:', error);
      return [];
    }
  }
}

export function createMCPClient(): MCPClient {
  return new MCPClient();
}