import { AIProvider } from './types';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';

export * from './types';

export function getAIProvider(type: string): AIProvider {
    switch (type.toLowerCase()) {
        case 'claude':
            return new ClaudeProvider();
        case 'openai':
            return new OpenAIProvider();
        case 'gemini':
            return new GeminiProvider();
        default:
            throw new Error(`Unknown AI provider: ${type}`);
    }
}
