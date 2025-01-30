'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { createBrowserClient } from '@supabase/ssr';
import { radarService } from '@/lib/services/radar-service';

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

interface QuoteMetadata {
  isQuote: boolean;
  destination?: {
    from: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      placeDetails: {
        city: string;
        state: string;
        country: string;
        latitude: number;
        longitude: number;
        stateCode: string;
        postalCode: string;
        coordinates: {
          latitude: number;
          longitude: number;
        };
        countryCode: string;
        countryFlag: string;
        formattedAddress: string;
      };
      formattedAddress: string;
    };
    to: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      placeDetails: {
        city: string;
        state: string;
        country: string;
        latitude: number;
        longitude: number;
        stateCode: string;
        postalCode: string;
        coordinates: {
          latitude: number;
          longitude: number;
        };
        countryCode: string;
        countryFlag: string;
        formattedAddress: string;
      };
      formattedAddress: string;
    };
    pickupDate?: string;
    pickupTimeSlot?: string;
  };
  packageDetails?: {
    type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight';
    volume: string;
    weight: string;
    hazardous: boolean;
    palletCount?: string;
    specialRequirements: string;
  };
  selectedService?: 'express_freight' | 'standard_freight' | 'eco_freight';
  estimatedPrice?: number;
  estimatedDelivery?: string;
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

interface AIRequestPayload {
  message: string;
  conversationHistory: Message[];
  agentType: 'quote';
  metadata: RequestMetadata;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const validateAddresses = async (content: string) => {
    // Add a message indicating we're checking addresses
    const checkingMessage: Message = {
      role: 'assistant',
      content: 'Checking available options, one minute...',
      metadata: { timestamp: Date.now() }
    };
    setMessages(prev => [...prev, checkingMessage]);

    // Try to extract addresses from the message
    const fromMatch = content.match(/(?:from|pickup).*?([^,]+,[^,]+,[^,]+)/i);
    const toMatch = content.match(/(?:to|delivery).*?([^,]+,[^,]+,[^,]+)/i);

    if (!fromMatch || !toMatch) {
      return {
        isValid: false,
        error: 'Could not find both pickup and delivery addresses in your message. Please provide complete addresses.'
      };
    }

    const fromAddress = fromMatch[1].trim();
    const toAddress = toMatch[1].trim();

    // Geocode both addresses
    const [fromGeocode, toGeocode] = await Promise.all([
      radarService.geocodeAddress(fromAddress),
      radarService.geocodeAddress(toAddress)
    ]);

    if (!fromGeocode || !toGeocode) {
      return {
        isValid: false,
        error: 'One or both addresses could not be found. Please check the addresses and try again.'
      };
    }

    // Calculate route
    const route = await radarService.calculateRoute(
      { latitude: fromGeocode.latitude, longitude: fromGeocode.longitude },
      { latitude: toGeocode.latitude, longitude: toGeocode.longitude }
    );

    if (!route) {
      return {
        isValid: false,
        error: 'Could not calculate a route between these addresses. Please try different addresses.'
      };
    }

    // Parse pickup date from the message
    let pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1); // Default to tomorrow
    pickupDate.setHours(9, 0, 0, 0);

    const dateMatch = content.match(/next\s+(\w+)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (dateMatch) {
      const [_, day, hour, minute, ampm] = dateMatch;
      const today = new Date();
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = daysOfWeek.findIndex(d => d.startsWith(day.toLowerCase()));
      
      if (targetDay !== -1) {
        let daysToAdd = targetDay - today.getDay();
        if (daysToAdd <= 0) daysToAdd += 7;
        pickupDate = new Date(today);
        pickupDate.setDate(today.getDate() + daysToAdd);
        if (hour) {
          let hourNum = parseInt(hour);
          if (ampm && ampm.toLowerCase() === 'pm' && hourNum < 12) hourNum += 12;
          if (ampm && ampm.toLowerCase() === 'am' && hourNum === 12) hourNum = 0;
          pickupDate.setHours(hourNum, minute ? parseInt(minute) : 0, 0, 0);
        }
      }
    }

    // Get pickup time slot based on the hour
    const hour = pickupDate.getHours();
    let pickupTimeSlot = 'morning_2';
    if (hour >= 12 && hour < 17) {
      pickupTimeSlot = 'afternoon_2';
    } else if (hour >= 17) {
      pickupTimeSlot = 'evening_2';
    }

    // Return the geocoded addresses and route information
    return {
      isValid: true,
      quoteMetadata: {
        isQuote: true,
        destination: {
          from: {
            address: fromAddress,
            coordinates: {
              latitude: fromGeocode.latitude,
              longitude: fromGeocode.longitude
            },
            placeDetails: {
              city: fromGeocode.city,
              state: fromGeocode.state,
              country: fromGeocode.country,
              latitude: fromGeocode.latitude,
              longitude: fromGeocode.longitude,
              stateCode: fromGeocode.stateCode,
              postalCode: fromGeocode.postalCode,
              coordinates: {
                latitude: fromGeocode.latitude,
                longitude: fromGeocode.longitude
              },
              countryCode: fromGeocode.countryCode,
              countryFlag: fromGeocode.countryFlag,
              formattedAddress: fromGeocode.formattedAddress
            },
            formattedAddress: fromGeocode.formattedAddress
          },
          to: {
            address: toAddress,
            coordinates: {
              latitude: toGeocode.latitude,
              longitude: toGeocode.longitude
            },
            placeDetails: {
              city: toGeocode.city,
              state: toGeocode.state,
              country: toGeocode.country,
              latitude: toGeocode.latitude,
              longitude: toGeocode.longitude,
              stateCode: toGeocode.stateCode,
              postalCode: toGeocode.postalCode,
              coordinates: {
                latitude: toGeocode.latitude,
                longitude: toGeocode.longitude
              },
              countryCode: toGeocode.countryCode,
              countryFlag: toGeocode.countryFlag,
              formattedAddress: toGeocode.formattedAddress
            },
            formattedAddress: toGeocode.formattedAddress
          },
          pickupDate: pickupDate.toISOString().split('T')[0],
          pickupTimeSlot
        },
        route: {
          distance: route.distance,
          duration: route.duration
        }
      }
    };
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
      // Only validate addresses if we're at the address collection step
      // and the message contains address information
      let quoteMetadata: QuoteMetadata | undefined;
      const lastAssistantMessage = messages
        .filter(m => m.role === 'assistant')
        .pop()?.content || '';

      const isAddressStep = lastAssistantMessage.includes('pickup address') || 
                           lastAssistantMessage.includes('delivery address');
      
      if (isAddressStep && (input.toLowerCase().includes('from') || input.toLowerCase().includes('to'))) {
        const validation = await validateAddresses(input);
        if (!validation.isValid) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: validation.error,
            metadata: { timestamp: Date.now() }
          }]);
          setIsLoading(false);
          return;
        }
        quoteMetadata = validation.quoteMetadata;
      }

      const response = await fetch('/api/ai-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: [...messages, userMessage],
          agentType: "quote",
          metadata: {
            userId: user?.id,
            customer: {
              id: user?.id,
              name: user?.name || 'Anonymous',
              email: user?.email
            },
            token: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            session: session,
            quote: quoteMetadata
          }
        }),
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
              console.log('Received SSE data:', data); // Debug log

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
              } else if (data.type === 'sources') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  newMessages[newMessages.length - 1] = {
                    ...lastMessage,
                    metadata: {
                      ...lastMessage.metadata,
                      agent: 'QUOTE_AGENT',
                      context: data.sources
                    }
                  };
                  return newMessages;
                });
              } else if (data.type === 'debug' && process.env.NODE_ENV === 'development') {
                // Log debug information in development
                console.group('Quote Agent Debug Logs');
                data.logs.forEach((log: string) => console.log(log));
                console.groupEnd();
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
          },
        };
        return newMessages;
      });
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