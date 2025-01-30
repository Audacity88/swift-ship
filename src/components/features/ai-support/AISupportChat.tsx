'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { createBrowserClient } from '@supabase/ssr';
import { QuoteMetadata } from '@/types/quote';
import { quoteMetadataService } from '@/lib/services/quote-metadata-service';
import { shipmentService } from '@/lib/services';

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
  agentType: 'docs' | 'shipments' | 'support' | 'quote';
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
  shipments?: any[];
}

interface AISupportChatProps {
  agentType: 'docs' | 'shipments' | 'support' | 'quote';
  initialMessage?: string;
  className?: string;
}

const STREAM_INTERVAL = 50; // ms per word for streaming simulation

export function AISupportChat({ agentType, initialMessage, className }: AISupportChatProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
  const [customerShipments, setCustomerShipments] = useState<any[]>([]);

  const scrollToBottom = () => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      const scrollHeight = viewport.scrollHeight;
      const height = viewport.clientHeight;
      const maxScrollTop = scrollHeight - height;
      viewport.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch customer shipments when using shipments agent
  useEffect(() => {
    const fetchShipments = async () => {
      if (agentType === 'shipments' && user?.id) {
        try {
          const shipments = await shipmentService.getCustomerShipments(undefined, user.id);
          // Only keep the last 5 shipments and map to expected format
          const optimizedShipments = shipments.slice(-5).map(shipment => ({
            id: shipment.id,
            status: shipment.status,
            type: shipment.package_type || 'standard',
            origin: shipment.from_address?.formatted_address || '',
            destination: shipment.to_address?.formatted_address || '',
            tracking_number: shipment.tracking_number,
            scheduled_pickup: shipment.pickup_date,
            estimated_delivery: shipment.estimated_delivery,
            actual_delivery: shipment.delivered_at,
            metadata: {
              service_level: shipment.service_level,
              weight: shipment.package_details?.weight,
              volume: shipment.package_details?.volume
            }
          }));
          setCustomerShipments(optimizedShipments);
        } catch (error) {
          console.error('Error fetching customer shipments:', error);
        }
      }
    };

    void fetchShipments();
  }, [agentType, user?.id]);

  const simulateStreaming = async (content: string, updateMessage: (text: string) => void) => {
    const words = content.split(/(\s+)/); // Split by whitespace but keep the separators
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += words[i];
      updateMessage(currentText);
      // Only add delay if it's an actual word (not whitespace)
      if (words[i].trim()) {
        await new Promise(resolve => setTimeout(resolve, STREAM_INTERVAL));
      }
    }
  };

  const handleChunkUpdate = async (chunk: string, accumulatedContent: string, lastMessage: Message) => {
    if (agentType === 'quote') {
      // Use streaming effect for quote agent
      await simulateStreaming(
        chunk,
        (streamedText) => {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              content: accumulatedContent + streamedText,
              metadata: {
                ...lastMsg.metadata,
                timestamp: Date.now(),
              }
            };
            return newMessages;
          });
        }
      );
    } else {
      // Immediate update for other agents
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        newMessages[newMessages.length - 1] = {
          ...lastMsg,
          content: accumulatedContent + chunk,
          metadata: {
            ...lastMsg.metadata,
            timestamp: Date.now(),
          }
        };
        return newMessages;
      });
    }
  };

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
      let metadata: RequestMetadata = {
        userId: user?.id || '',
        customer: {
          id: user?.id || '',
          name: user?.email?.split('@')[0] || 'Anonymous',
          email: user?.email || 'anonymous@example.com'
        },
        token: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        session: session ? {
          ...session,
          user: {
            id: user?.id,
            email: user?.email,
            user_metadata: user?.user_metadata,
            app_metadata: user?.app_metadata,
            aud: user?.aud,
            created_at: user?.created_at
          }
        } : undefined
      };

      // Add shipments to metadata if using shipments agent
      if (agentType === 'shipments' && customerShipments.length > 0) {
        metadata.shipments = customerShipments;
      }

      if (agentType === 'quote') {
        // Check if user is logged in
        if (!user?.id) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'You need to be logged in to create a shipping quote. Please log in and try again.',
            metadata: {
              timestamp: Date.now(),
              agent: agentType
            }
          }]);
          setIsLoading(false);
          return;
        }

        // Always include the current quote metadata in the request
        metadata.quote = quoteMetadataState;

        // Check if we're in service selection step
        const lastAssistantMessage = messages
          .filter(m => m.role === 'assistant')
          .pop()?.content || '';

        const isServiceSelection = lastAssistantMessage.includes('Please select your preferred service option');
        const isQuoteConfirmation = lastAssistantMessage.includes('Would you like me to create this shipping quote for you?');

        if (isServiceSelection) {
          const serviceType = input.trim();
          if (['1', '2', '3'].includes(serviceType)) {
            // Map selection to service type
            const serviceMap = {
              '1': 'express_freight',
              '2': 'standard_freight',
              '3': 'eco_freight'
            } as const;
            const selectedService = serviceMap[serviceType as keyof typeof serviceMap];
            
            // Update metadata with selected service
            const updatedMetadata: QuoteMetadata = {
              ...quoteMetadataState,
              selectedService
            };
            setQuoteMetadataState(updatedMetadata);
            metadata.quote = updatedMetadata;
          }
        } else if (isQuoteConfirmation) {
          const userResponse = input.trim().toLowerCase();
          if (userResponse === 'yes' || userResponse === 'y') {
            // Verify we have all required metadata
            const hasRequiredMetadata = 
              quoteMetadataState.packageDetails?.type &&
              quoteMetadataState.packageDetails?.volume &&
              quoteMetadataState.packageDetails?.weight &&
              quoteMetadataState.destination?.from?.formattedAddress &&
              quoteMetadataState.destination?.to?.formattedAddress &&
              quoteMetadataState.selectedService &&
              quoteMetadataState.route?.distance?.kilometers;

            if (!hasRequiredMetadata) {
              // Add error message if metadata is incomplete
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I apologize, but some required information is missing. Let\'s start over to ensure we have all the necessary details.',
                metadata: { timestamp: Date.now() }
              }]);
              setIsLoading(false);
              return;
            }
          }
        }

        // Check for package details in the message
        const packageDetails = quoteMetadataService.extractPackageDetails(input);
        if (packageDetails) {
          setQuoteMetadataState(prev => ({
            ...prev,
            packageDetails
          }));
        }

        // Check for addresses and validate them
        if (quoteMetadataService.isAddressStep(lastAssistantMessage) && 
            quoteMetadataService.hasAddressInfo(input)) {
          // Add initial checking message
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '',
            metadata: { timestamp: Date.now() }
          }]);

          // Stream the initial checking message as a single unit
          await simulateStreaming(
            'Checking available options...\nValidating addresses...',
            (streamedText) => {
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                newMessages[newMessages.length - 1] = {
                  ...lastMsg,
                  content: streamedText,
                  metadata: {
                    ...lastMsg.metadata,
                    timestamp: Date.now()
                  }
                };
                return newMessages;
              });
            }
          );

          // Update progress messages during validation
          const updateProgress = async (progress: string) => {
            // Append the progress message with a newline
            const fullMessage = '\n' + progress;
            // Update the message immediately without streaming
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              newMessages[newMessages.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + fullMessage,
                metadata: {
                  ...lastMsg.metadata,
                  timestamp: Date.now()
                }
              };
              return newMessages;
            });
            // Add a small delay to make progress visible
            await new Promise(resolve => setTimeout(resolve, 500));
          };

          const validationResult = await quoteMetadataService.validateAddresses(input, {
            onGeocoding: () => updateProgress('Looking up locations...'),
            onRouteCalculation: () => updateProgress('Calculating optimal route...'),
            onServiceCalculation: () => updateProgress('Determining available services...')
          });

          if (!validationResult.isValid) {
            // Add error message without streaming
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              newMessages[newMessages.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + '\n\n' + (validationResult.error || 'Invalid addresses provided. Please provide complete addresses including city and state.'),
                metadata: {
                  ...lastMsg.metadata,
                  timestamp: Date.now()
                }
              };
              return newMessages;
            });
            setIsLoading(false);
            return;
          }

          if (validationResult.quoteMetadata) {
            // Update state with validation result
            const updatedMetadata = {
              ...quoteMetadataState,
              ...validationResult.quoteMetadata
            };
            setQuoteMetadataState(updatedMetadata);

            // Add success message as a single unit
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              newMessages[newMessages.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + '\n\nAddresses validated successfully! Calculating service options...',
                metadata: {
                  ...lastMsg.metadata,
                  timestamp: Date.now()
                }
              };
              return newMessages;
            });

            // Calculate service options if we have all required information
            const hasPackageDetails = updatedMetadata?.packageDetails?.volume && 
                                    updatedMetadata?.packageDetails?.weight;
            const hasRouteInfo = updatedMetadata?.route?.distance?.kilometers;

            if (hasPackageDetails && hasRouteInfo) {
              const serviceOptions = quoteMetadataService.calculateServiceOptions(updatedMetadata);
              if (serviceOptions) {
                const finalMetadata = {
                  ...updatedMetadata,
                  ...serviceOptions
                };
                setQuoteMetadataState(finalMetadata);
                metadata.quote = finalMetadata;

                // Make the API call immediately after calculating service options
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
                  throw new Error('Failed to get response');
                }

                // Continue with response handling...
                await handleApiResponse(response);
                return;
              }
            }
          }
        }

        // If we're in address validation step and the validation failed, don't proceed with API call
        if (quoteMetadataService.isAddressStep(lastAssistantMessage) && 
            quoteMetadataService.hasAddressInfo(input) && 
            !quoteMetadataState.route) {
          setIsLoading(false);
          return;
        }
      }

      // Default API call for non-quote agents or when not in validation step
      const requestBody: AIRequestPayload = {
        message: userMessage.content,
        conversationHistory: [...messages, userMessage].slice(-10), // Only send last 10 messages
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
        if (response.status === 503) {
          throw new Error('The service is temporarily unavailable. Please try again in a few moments.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      await handleApiResponse(response);

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

  // Helper function to handle API response
  const handleApiResponse = async (response: Response) => {
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
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        buffer += text;
        
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (!message.trim() || !message.startsWith('data: ')) continue;

          try {
            const jsonStr = message.replace(/^data: /, '').trim();
            const data = JSON.parse(jsonStr);

            if (data.type === 'chunk') {
              const newContent = data.content;
              await handleChunkUpdate(newContent, accumulatedContent, assistantMessage);
              accumulatedContent += newContent;
            } else if (data.type === 'metadata') {
              lastMetadata = data.metadata;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  metadata: {
                    ...lastMessage.metadata,
                    ...data.metadata,
                    // Map matched docs to context format for consistent display
                    context: data.metadata?.matchedDocs?.map((doc: any) => ({
                      title: doc.title,
                      url: doc.url,
                      score: doc.score,
                      preview: doc.preview
                    }))
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
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
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
                {message.metadata?.context && message.metadata.context.length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="text-muted-foreground mb-1">Sources:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {message.metadata.context.map((source, index) => (
                        <li key={index} className="text-muted-foreground">
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
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
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