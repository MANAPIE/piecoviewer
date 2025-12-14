export interface FileChange {
    filename: string;
    status: 'added' | 'modified' | 'removed';
    additions: number;
    deletions: number;
    patch?: string;
}

export interface ReviewContext {
    prTitle: string;
    prDescription: string;
    fileChanges: FileChange[];
    customPrompt?: string;
    reviewLanguage?: string;
    reviewStyle?: string;
}

export interface FileComment {
    filename: string;
    line?: number;
    comment: string;
}

export interface ReviewResult {
    summary: string;
    fileComments: FileComment[];
    suggestions: string[];
}

export interface AIProvider {
    name: string;
    review(diff: string, context: ReviewContext): Promise<ReviewResult>;
    setApiKey(apiKey: string): void;
}
