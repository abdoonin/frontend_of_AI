'use client'

import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { AiChatbot } from '@/components/ai-chatbot'

export default function ChatbotPage() {
  return (
    <AuthGuard>
      <AppShell breadcrumb={['Reference', 'Assistant']}>
        <AiChatbot />
      </AppShell>
    </AuthGuard>
  )
}
