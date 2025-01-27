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
    agent?: string;
    timestamp?: number;
    context?: Array<{
      title: string;
      url: string;
      score: number;
    }>;
  };
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);

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

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
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
          conversationHistory: updatedMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) throw new Error('No response body');

      // Initialize streaming message
      setStreamingMessage({
        role: 'assistant',
        content: '',
        metadata: {
          timestamp: Date.now(),
        },
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(5));

              if (data.type === 'chunk') {
                setStreamingMessage(prev => ({
                  role: 'assistant',
                  content: prev ? prev.content + data.content : data.content,
                  metadata: {
                    timestamp: Date.now(),
                  }
                }));
              } else if (data.type === 'sources') {
                setStreamingMessage(prev => {
                  if (!prev) return null;
                  
                  // Just update the streaming message with sources
                  return {
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      agent: 'DOCS_AGENT',
                      context: data.sources
                    }
                  };
                });
              }
            } catch (e) {
              // Silently handle parsing errors
            }
          }
        }
      } catch (error) {
        throw error;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        metadata: {
          timestamp: Date.now(),
        },
      };
      setMessages(prev => [...prev, errorMessage]);
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
                'flex w-full max-w-[80%] rounded-lg px-4 py-2',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <div className="space-y-2 w-full">
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          ))}
          {streamingMessage && (
            <div className="flex w-full max-w-[80%] rounded-lg px-4 py-2 bg-muted">
              <div className="space-y-2 w-full">
                <p className="text-sm whitespace-pre-wrap break-words">{streamingMessage.content}</p>
                {streamingMessage.metadata?.agent && (
                  <div className="space-y-1">
                    <p className="text-xs opacity-70">
                      Answered by: {streamingMessage.metadata.agent.replace('_', ' ')}
                    </p>
                    {streamingMessage.metadata.context && streamingMessage.metadata.context.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs opacity-70">Sources:</p>
                        <ul className="text-xs opacity-70 space-y-1">
                          {streamingMessage.metadata.context.map((source, idx) => (
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
          )}
          {isLoading && !streamingMessage && (
            <div className="flex w-max max-w-[80%] rounded-lg px-4 py-2 bg-muted">
              <p className="text-sm">Thinking...</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
} 