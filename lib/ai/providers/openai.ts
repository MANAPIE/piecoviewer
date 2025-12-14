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

    // 시스템 메시지를 리뷰 언어와 스타일에 맞게 설정
    const systemMessage = context.reviewLanguage === 'en'
      ? 'You are a code review expert. Provide detailed and constructive feedback.'
      : '당신은 코드 리뷰 전문가입니다. 상세하고 건설적인 피드백을 제공해주세요.';

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemMessage
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
    // 리뷰 언어 설정
    const languageInstruction = context.reviewLanguage === 'en'
      ? 'Please write your review in English'
      : '한국어로 작성해주세요';

    // 리뷰 스타일 설정
    let styleInstruction = '';
    let fileCommentsInstruction = '';

    switch (context.reviewStyle) {
      case 'brief':
        styleInstruction = context.reviewLanguage === 'en'
          ? 'Be brief and concise. Focus only on critical issues in the summary.'
          : '간략하고 핵심만 언급해주세요. summary에 중요한 문제만 집중하세요.';
        fileCommentsInstruction = context.reviewLanguage === 'en'
          ? 'Leave fileComments as an empty array [].'
          : 'fileComments는 빈 배열 []로 남겨주세요.';
        break;
      case 'strict':
        styleInstruction = context.reviewLanguage === 'en'
          ? 'Be thorough and strict. Point out all issues including minor ones, coding standards, and best practices.'
          : '엄격하고 철저하게 검토해주세요. 사소한 문제, 코딩 표준, 모범 사례까지 모두 지적해주세요.';
        fileCommentsInstruction = context.reviewLanguage === 'en'
          ? 'Provide detailed fileComments for all issues found.'
          : '발견한 모든 문제에 대해 상세한 fileComments를 작성해주세요.';
        break;
      case 'detailed':
      default:
        styleInstruction = context.reviewLanguage === 'en'
          ? 'Provide detailed and constructive feedback with explanations.'
          : '상세하고 건설적인 피드백을 설명과 함께 제공해주세요.';
        fileCommentsInstruction = context.reviewLanguage === 'en'
          ? 'Comment only on lines that have serious issues or need improvement.'
          : '심각한 문제나 개선이 필요한 라인에만 코멘트를 답니다.';
        break;
    }

    let prompt = `Please review the following Pull Request.

**PR Title:** ${context.prTitle}
**PR Description:** ${context.prDescription || 'None'}

**Changed Files:**
${context.fileChanges.map(f => `- ${f.filename} (${f.status})`).join('\n')}

**Full Diff:**
\`\`\`diff
${diff}
\`\`\`

Please write your review in the following JSON format:

{
  "summary": "Overall summary, evaluation, and improvement suggestions for the PR",
  "fileComments": [
    {
      "filename": "file path",
      "line": line number (based on changed lines, number),
      "comment": "specific comment for this line"
    }
  ]
}

**Important Rules:**
1. summary should include overall evaluation and improvement suggestions for the PR
2. fileComments are reviews for specific code lines
3. line should be the line number of the changed line (based on + lines in diff)
4. ${fileCommentsInstruction}
5. Each comment should include specific and actionable advice
6. ${languageInstruction}
7. ${styleInstruction}
8. Use line breaks to ensure readability for sentences and lists
9. Respond in valid JSON format`;

    if (context.customPrompt) {
      prompt += `\n\n**Additional Requirements:**\n${context.customPrompt}`;
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
