import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import SettingsForm from './SettingsForm';

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email! },
    include: { settings: true }
  });

  if (!user) {
    redirect('/login');
  }

  return <SettingsForm user={user} settings={user.settings} />;
}