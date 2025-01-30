'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { createBrowserClient } from '@supabase/ssr';
import { QuoteMetadata } from '@/types/quote';
import { quoteMetadataService } from '@/lib/services/quote-metadata-service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    timestamp?: number;
    agent?: string;
    context?: Array<{
      title: string;
      url: string;
      score: number;
    }>;
  };
}

interface AIRequestPayload {
  message: string;
  conversationHistory: Message[];
  agentType: 'docs' | 'router' | 'shipments' | 'support' | 'quote';
  metadata: RequestMetadata;
}

interface RequestMetadata {
  userId: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  token?: string;
  session?: any;
  quote?: QuoteMetadata;
}

interface AISupportChatProps {
  agentType: 'docs' | 'router' | 'shipments' | 'support' | 'quote';
  initialMessage?: string;
  className?: string;
}

export function AISupportChat({ agentType, initialMessage, className }: AISupportChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => 
    initialMessage ? [{
      role: 'assistant',
      content: initialMessage,
      metadata: { timestamp: Date.now(), agent: agentType }
    }] : []
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quoteMetadataState, setQuoteMetadataState] = useState<QuoteMetadata>({ isQuote: true });
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { session } } = await supabase.auth.getSession();

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      metadata: {
        timestamp: Date.now(),
      },
    };

    // Add user message to state immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Handle quote-specific metadata if this is the quote agent
      let metadata: RequestMetadata = {
        userId: user?.id || '',
        customer: {
          id: user?.id || '',
          name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous',
          email: user?.email || 'anonymous@example.com'
        },
        token: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        session
      };

      if (agentType === 'quote') {
        // Check for package details in the message
        const packageDetails = quoteMetadataService.extractPackageDetails(input);
        if (packageDetails) {
          setQuoteMetadataState(prev => ({
            ...prev,
            packageDetails
          }));
        }

        // Check for addresses and validate them
        const lastAssistantMessage = messages
          .filter(m => m.role === 'assistant')
          .pop()?.content || '';

        if (quoteMetadataService.isAddressStep(lastAssistantMessage) && 
            quoteMetadataService.hasAddressInfo(input)) {
          const validationResult = await quoteMetadataService.validateAddresses(input, () => {
            // Add checking message
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: 'Checking available options, one minute...',
              metadata: { timestamp: Date.now() }
            }]);
          });

          if (!validationResult.isValid) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: validationResult.error || 'Invalid addresses provided.',
              metadata: { timestamp: Date.now() }
            }]);
            setIsLoading(false);
            return;
          }
          if (validationResult.quoteMetadata) {
            setQuoteMetadataState(prev => ({
              ...prev,
              ...validationResult.quoteMetadata
            }));
          }
        }

        // If we don't have package details in current state, try to find them in history
        let currentQuoteMetadata = {
          ...quoteMetadataState,
          ...(packageDetails && { packageDetails })
        };

        if (!currentQuoteMetadata.packageDetails) {
          const historicalPackageDetails = quoteMetadataService.findLastPackageDetails([...messages, userMessage]);
          if (historicalPackageDetails) {
            currentQuoteMetadata = {
              ...currentQuoteMetadata,
              packageDetails: historicalPackageDetails
            };
            setQuoteMetadataState(currentQuoteMetadata);
          }
        }

        // Calculate service options if we have all required information
        const hasPackageDetails = currentQuoteMetadata?.packageDetails?.volume && 
                                currentQuoteMetadata?.packageDetails?.weight;
        const hasRouteInfo = currentQuoteMetadata?.route?.distance?.kilometers;

        if (hasPackageDetails && hasRouteInfo) {
          const serviceOptions = quoteMetadataService.calculateServiceOptions(currentQuoteMetadata);
          if (serviceOptions) {
            currentQuoteMetadata = {
              ...currentQuoteMetadata,
              ...serviceOptions
            };
            setQuoteMetadataState(currentQuoteMetadata);
          }
        }

        metadata.quote = currentQuoteMetadata;
      }

      const requestBody: AIRequestPayload = {
        message: userMessage.content,
        conversationHistory: [...messages, userMessage],
        agentType,
        metadata
      };

      const response = await fetch('/api/ai-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) throw new Error('No response body');

      // Initialize assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        metadata: {
          timestamp: Date.now(),
          agent: agentType
        },
      };

      // Add empty assistant message that will be updated
      setMessages(prev => [...prev, assistantMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let lastMetadata = {};
      let buffer = ''; // Buffer for incomplete JSON data

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          buffer += text; // Add new text to buffer
          
          // Process complete messages from buffer
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep the last potentially incomplete message

          for (const message of messages) {
            if (!message.trim() || !message.startsWith('data: ')) continue;

            try {
              const jsonStr = message.replace(/^data: /, '').trim();
              const data = JSON.parse(jsonStr);

              if (data.type === 'chunk') {
                accumulatedContent += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  newMessages[newMessages.length - 1] = {
                    ...lastMessage,
                    content: accumulatedContent,
                    metadata: {
                      ...lastMessage.metadata,
                      timestamp: Date.now(),
                    }
                  };
                  return newMessages;
                });
              } else if (data.type === 'metadata') {
                lastMetadata = data.metadata;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  newMessages[newMessages.length - 1] = {
                    ...lastMessage,
                    metadata: {
                      ...lastMessage.metadata,
                      ...data.metadata
                    }
                  };
                  return newMessages;
                });

                // Update quote metadata if present
                if (agentType === 'quote' && data.metadata?.quote) {
                  setQuoteMetadataState(prev => ({
                    ...prev,
                    ...data.metadata.quote
                  }));
                }
              } else if (data.type === 'sources') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  newMessages[newMessages.length - 1] = {
                    ...lastMessage,
                    metadata: {
                      ...lastMessage.metadata,
                      agent: agentType.toUpperCase() + '_AGENT',
                      context: data.sources
                    }
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', {
                message,
                error: e
              });
            }
          }
        }

        // Process any remaining data in buffer
        if (buffer.trim() && buffer.startsWith('data: ')) {
          try {
            const jsonStr = buffer.replace(/^data: /, '').trim();
            const data = JSON.parse(jsonStr);
            
            if (data.type === 'chunk') {
              accumulatedContent += data.content;
            } else if (data.type === 'metadata') {
              lastMetadata = data.metadata;
            }
          } catch (e) {
            console.error('Error parsing final buffer:', {
              buffer,
              error: e
            });
          }
        }

        // After the stream is complete, update messages one final time
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: accumulatedContent,
            metadata: {
              ...lastMessage.metadata,
              ...lastMetadata,
              timestamp: Date.now(),
            }
          };
          return newMessages;
        });
      } catch (error) {
        console.error('Error in stream reading:', error);
        throw error;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error in request:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          metadata: {
            timestamp: Date.now(),
            agent: agentType
          },
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-[600px] w-full max-w-2xl mx-auto border rounded-lg overflow-hidden bg-background", className)}>
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
                {message.metadata?.context && (
                  <div className="mt-2 text-sm">
                    <p className="text-muted-foreground mb-1">Sources:</p>
                    <ul className="list-disc pl-4 space-y-1 text-blue-500 mb-1">
                      {message.metadata.context.map((source, index) => (
                        <li key={index}>
                          <a 
                            href={source.url} 
                            className="text-blue-500 hover:text-blue-600 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 text-xs">
                      <p>Need more help? <a href="/portal/tickets/new" className="text-blue-500 hover:text-blue-600 hover:underline">Contact Support</a></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
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