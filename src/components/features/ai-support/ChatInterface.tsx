'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    agent?: 'DOCS_AGENT' | 'SUPPORT_AGENT' | 'BILLING_AGENT';
    timestamp: number;
    context?: Array<{
      title: string;
      url?: string;
      score: number;
    }>;
  };
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      metadata: {
        timestamp: Date.now(),
      },
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        metadata: {
          agent: data.metadata.agent,
          timestamp: data.metadata.timestamp,
          context: data.metadata.context,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        metadata: {
          timestamp: Date.now(),
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border rounded-lg overflow-hidden bg-background">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex w-max max-w-[80%] rounded-lg px-4 py-2',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <div className="space-y-2">
                <p className="text-sm">{message.content}</p>
                {message.metadata?.agent && (
                  <div className="space-y-1">
                    <p className="text-xs opacity-70">
                      Answered by: {message.metadata.agent.replace('_', ' ')}
                    </p>
                    {message.metadata.context && message.metadata.context.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs opacity-70">Sources:</p>
                        <ul className="text-xs opacity-70 space-y-1">
                          {message.metadata.context.map((source, idx) => (
                            <li key={idx}>
                              {source.url ? (
                                <a 
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {source.title} ({Math.round(source.score * 100)}% match)
                                </a>
                              ) : (
                                <span>{source.title} ({Math.round(source.score * 100)}% match)</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex w-max max-w-[80%] rounded-lg px-4 py-2 bg-muted">
              <p className="text-sm">Thinking...</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
} 