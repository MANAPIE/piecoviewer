import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { prisma } from '@/lib/db/prisma';

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
                // DB에 사용자 저장/업데이트
                await prisma.user.upsert({
                    where: { githubId: profile.id.toString() },
                    update: {
                        name: profile.name || user.name,
                        email: profile.email || user.email,
                        avatarUrl: user.image,
                        accessToken: account.access_token!
                    },
                    create: {
                        githubId: profile.id.toString(),
                        name: profile.name || user.name,
                        email: profile.email || user.email,
                        avatarUrl: user.image,
                        accessToken: account.access_token!
                    }
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
