import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { userQueries } from '@/lib/db/sqlite';

interface GitHubProfile {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
}

const handler = NextAuth({
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'read:user user:email repo read:org'
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'github' && profile) {
                const githubProfile = profile as GitHubProfile;
                // DB에 사용자 저장/업데이트
                userQueries.upsert({
                    githubId: githubProfile.id.toString(),
                    name: githubProfile.name || user.name || null,
                    email: githubProfile.email || user.email || null,
                    avatarUrl: user.image || null,
                    accessToken: account.access_token!
                });
            }
            return true;
        },
        async session({ session, token }) {
            if (session.user) {
                // @ts-expect-error - NextAuth types don't include custom user properties
                session.user.id = token.sub;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login'
    }
});

export { handler as GET, handler as POST };
