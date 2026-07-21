import { appRedirect } from '@/lib/serverRedirect';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { isStudentEntitled } from '@/lib/featureFlags';
import { loadStudentChatbotPageData } from '@/lib/chatbot/loadStudentSession';
import { ChatbotSession } from '@/components/chatbot/ChatbotSession';

interface PageProps {
  params: Promise<{ chatbotId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function ChatbotPage(props: PageProps) {
  const { chatbotId } = await props.params;
  const { sessionId } = await props.searchParams;
  const user = await getOrCreateUser();
  if (!user) appRedirect('/login');
  if (user.role !== 'STUDENT') appRedirect('/login');
  if (!isStudentEntitled(user)) appRedirect('/payment');

  const initial = await loadStudentChatbotPageData({
    studentId: user.id,
    chatbotId,
    sessionId,
  });

  if (!initial) {
    appRedirect('/dashboard/student/discussions');
  }

  return <ChatbotSession chatbotId={chatbotId} initial={initial} />;
}
