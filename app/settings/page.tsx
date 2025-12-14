import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { userQueries, settingsQueries } from '@/lib/db/sqlite';
import SettingsForm from './SettingsForm';

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  const user = userQueries.findByEmail(session.user.email!);

  if (!user) {
    redirect('/login');
  }

  const settings = settingsQueries.findByUserId(user.id);

  // settings를 camelCase로 변환
  const formattedSettings = settings ? {
    aiProvider: settings.ai_provider,
    claudeApiKey: settings.claude_api_key,
    openaiApiKey: settings.openai_api_key,
    geminiApiKey: settings.gemini_api_key,
    useMCP: settings.use_mcp === 1,
    mcpServerCommand: settings.mcp_server_command,
    mcpServerArgs: settings.mcp_server_args,
    mcpServerEnv: settings.mcp_server_env,
    customPrompt: settings.custom_prompt,
    reviewLanguage: settings.review_language,
    reviewStyle: settings.review_style,
    analyzeCodebase: settings.analyze_codebase === 1
  } : null;

  return <SettingsForm user={user} settings={formattedSettings} />;
}