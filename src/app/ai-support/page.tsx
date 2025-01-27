import { ChatInterface } from '@/components/features/ai-support/ChatInterface';

export const metadata = {
  title: 'AI Support | Zendesk Clone',
  description: 'Get instant help from our AI support system',
};

export default function AISupportPage() {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">AI Support</h1>
          <p className="text-muted-foreground">
            Get instant help from our AI support system. Ask questions about documentation,
            technical support, or billing inquiries.
          </p>
        </div>
        <ChatInterface />
      </div>
    </div>
  );
} 