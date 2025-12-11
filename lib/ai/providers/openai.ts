import OpenAI from 'openai';
import { AIProvider, ReviewContext, ReviewResult } from '../types';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private client: OpenAI | null = null;
  private apiKey: string = '';

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey });
  }

  async review(diff: string, context: ReviewContext): Promise<ReviewResult> {
    if (!this.client) {
      throw new Error('API key not set');
    }

    const prompt = this.buildPrompt(diff, context);

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '당신은 코드 리뷰 전문가입니다. 상세하고 건설적인 피드백을 제공해주세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000
    });

    const responseText = completion.choices[0]?.message?.content || '';
    return this.parseResponse(responseText);
  }

  private buildPrompt(diff: string, context: ReviewContext): string {
    let prompt = `다음 Pull Request를 코드 리뷰해주세요.

**PR 제목:** ${context.prTitle}
**PR 설명:** ${context.prDescription || '없음'}

**변경된 파일 목록:**
${context.fileChanges.map(f => `- ${f.filename} (${f.status})`).join('\n')}

**전체 Diff:**
\`\`\`diff
${diff}
\`\`\`

다음 JSON 형식으로 리뷰를 작성해주세요:

{
  "summary": "PR 전체에 대한 요약, 평가, 그리고 전반적인 개선 제안을 포함",
  "fileComments": [
    {
      "filename": "파일경로",
      "line": 라인번호 (변경된 라인 기준, 숫자),
      "comment": "해당 라인에 대한 구체적인 코멘트"
    }
  ]
}

**중요 규칙:**
1. summary에는 PR의 전반적인 평가와 개선 제안을 함께 작성해주세요
2. fileComments는 구체적인 코드 라인에 대한 리뷰입니다
3. line은 변경된 라인의 번호여야 합니다 (diff의 + 라인 기준)
4. 심각한 문제나 개선이 필요한 라인에만 코멘트를 답니다
5. 각 코멘트는 구체적이고 실행 가능한 조언을 포함해야 합니다
6. 한국어로 작성해주세요
7. 문장이나 목록은 줄바꿈을 통해 가독성을 확보해주세요
8. 반드시 유효한 JSON 형식으로 응답해주세요`;

    if (context.customPrompt) {
      prompt += `\n\n**추가 요구사항:**\n${context.customPrompt}`;
    }

    return prompt;
  }

  private parseResponse(response: string): ReviewResult {
    try {
      // JSON을 추출 (마크다운 코드 블록이나 다른 텍스트가 있을 수 있음)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { summary: response, fileComments: [], suggestions: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || '',
        fileComments: (parsed.fileComments || []).map((fc: { filename: string; line?: number; comment: string }) => ({
          filename: fc.filename,
          line: fc.line,
          comment: fc.comment
        })),
        suggestions: parsed.suggestions || []
      };
    } catch {
      // JSON 파싱 실패 시 전체 응답을 summary로 반환
      return {
        summary: response,
        fileComments: [],
        suggestions: []
      };
    }
  }
}
