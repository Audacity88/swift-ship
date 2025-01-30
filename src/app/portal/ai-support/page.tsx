import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AISupportChat } from '@/components/features/ai-support/AISupportChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'AI Support | Portal',
  description: 'Get instant help with our AI-powered support system',
};

const AGENT_CONFIGS = {
  docs: {
    title: 'Documentation',
    description: 'Search and explore our documentation',
    initialMessage: 'Hello! I can help you find information in our documentation. What would you like to know?'
  },
  support: {
    title: 'General Support',
    description: 'Get help with general inquiries',
    initialMessage: 'Hi! I\'m your support assistant. How can I help you today?'
  },
  shipments: {
    title: 'Shipment Tracking',
    description: 'Track and manage your shipments',
    initialMessage: 'I can help you track and manage your shipments. What information do you need?'
  },
  quote: {
    title: 'Quote Creation',
    description: 'Get instant shipping quotes',
    initialMessage: 'I\'ll help you create a shipping quote. Would you like to start?'
  },
  router: {
    title: 'Smart Router',
    description: 'Get directed to the right department',
    initialMessage: 'I\'ll help direct your inquiry to the right department. What do you need help with?'
  }
} as const;

export default function AISupportPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Support</h1>
        <p className="text-muted-foreground mt-2">
          Get instant help with our AI-powered support system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose Support Type</CardTitle>
          <CardDescription>
            Select the type of support you need
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="support" className="w-full">
            <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
              {Object.entries(AGENT_CONFIGS).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="text-sm">
                  {config.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(AGENT_CONFIGS).map(([key, config]) => (
              <TabsContent key={key} value={key} className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">{config.title}</h2>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                  <AISupportChat 
                    agentType={key as keyof typeof AGENT_CONFIGS} 
                    initialMessage={config.initialMessage}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 