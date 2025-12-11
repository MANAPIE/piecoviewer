import { Octokit } from '@octokit/rest';

export function createGitHubClient(accessToken: string) {
    return new Octokit({ auth: accessToken });
}

export async function getPRDiff(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number
) {
    const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: { format: 'diff' }
    });

    return data as unknown as string;
}

export async function getUserRepos(octokit: Octokit) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
    });

    return data;
}

export async function getRepoPRs(
    octokit: Octokit,
    owner: string,
    repo: string
) {
    const { data } = await octokit.pulls.list({
        owner,
        repo,
        state: 'open'
    });

    return data;
}

export async function postPRComment(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
    body: string
) {
    return await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body
    });
}
