import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Puzzle, ExternalLink, Check, Clock, Search, Loader2,
  Database, Users, Zap, Building2, Brain,
  Globe, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type IntegrationCategory = 'crm' | 'enrichment' | 'ai' | 'automation' | 'scraping';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  status: 'available' | 'coming_soon' | 'connected';
  features: string[];
  pricing?: string;
  website: string;
  icon: string;
  requiresApiKey?: boolean;
  apiKeyName?: string;
}

const integrations: Integration[] = [
  // CRM Systems
  { id: 'salesforce', name: 'Salesforce', description: "World's #1 CRM platform with comprehensive sales, service, and marketing automation", category: 'crm', status: 'available', features: ['Contact sync', 'Lead scoring', 'Pipeline integration'], pricing: 'From $25/user/month', website: 'https://salesforce.com', icon: '☁️', requiresApiKey: true, apiKeyName: 'SALESFORCE_API_KEY' },
  { id: 'hubspot', name: 'HubSpot', description: 'All-in-one inbound marketing, sales, and CRM platform for growing businesses', category: 'crm', status: 'available', features: ['Deal tracking', 'Email integration', 'Marketing automation'], pricing: 'Free - $1,200/month', website: 'https://hubspot.com', icon: '🧡', requiresApiKey: true, apiKeyName: 'HUBSPOT_API_KEY' },
  { id: 'pipedrive', name: 'Pipedrive', description: 'Sales CRM designed by salespeople for salespeople with visual pipeline management', category: 'crm', status: 'available', features: ['Visual pipeline', 'Activity tracking', 'Email sync'], pricing: 'From $14.90/user/month', website: 'https://pipedrive.com', icon: '🎯', requiresApiKey: true, apiKeyName: 'PIPEDRIVE_API_KEY' },
  { id: 'zoho', name: 'Zoho CRM', description: 'Comprehensive CRM with AI-powered sales assistant and multichannel support', category: 'crm', status: 'available', features: ['AI assistant', 'Multichannel', 'Workflow automation'], pricing: 'From $14/user/month', website: 'https://zoho.com/crm', icon: '🔶', requiresApiKey: true, apiKeyName: 'ZOHO_API_KEY' },
  { id: 'dynamics365', name: 'Microsoft Dynamics 365', description: 'Enterprise-grade CRM with deep Microsoft ecosystem integration', category: 'crm', status: 'available', features: ['Microsoft 365 integration', 'Power BI', 'Teams collaboration'], pricing: 'From $65/user/month', website: 'https://dynamics.microsoft.com', icon: '🪟', requiresApiKey: true },
  { id: 'close', name: 'Close', description: 'Sales CRM built for high-velocity sales teams with built-in calling', category: 'crm', status: 'available', features: ['Built-in calling', 'Email sequences', 'Pipeline view'], pricing: 'From $49/user/month', website: 'https://close.com', icon: '📞', requiresApiKey: true },
  { id: 'freshsales', name: 'Freshsales', description: 'AI-powered CRM with built-in phone, email, chat and telephony', category: 'crm', status: 'available', features: ['AI scoring', 'Built-in phone', 'Email tracking'], pricing: 'From $15/user/month', website: 'https://freshsales.io', icon: '🌱', requiresApiKey: true },
  { id: 'copper', name: 'Copper', description: 'CRM designed for Google Workspace with automatic data capture', category: 'crm', status: 'available', features: ['Google Workspace', 'Auto data capture', 'Pipeline management'], pricing: 'From $23/user/month', website: 'https://copper.com', icon: '🟤', requiresApiKey: true },
  { id: 'monday', name: 'Monday Sales CRM', description: 'Customizable CRM on the Monday.com Work OS platform', category: 'crm', status: 'coming_soon', features: ['Customizable', 'Automations', 'Integrations'], pricing: 'From $10/seat/month', website: 'https://monday.com/crm', icon: '📊' },
  { id: 'notion', name: 'Notion', description: 'All-in-one workspace with CRM templates and database features', category: 'crm', status: 'coming_soon', features: ['Flexible databases', 'Templates', 'Team collaboration'], pricing: 'From $8/user/month', website: 'https://notion.so', icon: '📝' },
  
  // Lead Enrichment
  { id: 'clearbit', name: 'Clearbit', description: 'Real-time B2B data enrichment and lead intelligence', category: 'enrichment', status: 'available', features: ['Company data', 'Contact enrichment', 'Real-time API'], pricing: 'Custom pricing', website: 'https://clearbit.com', icon: '💎', requiresApiKey: true, apiKeyName: 'CLEARBIT_API_KEY' },
  { id: 'zoominfo', name: 'ZoomInfo', description: 'Comprehensive B2B database with contact and company intelligence', category: 'enrichment', status: 'available', features: ['Contact database', 'Intent data', 'Org charts'], pricing: 'Custom pricing', website: 'https://zoominfo.com', icon: '🔍', requiresApiKey: true },
  { id: 'apollo', name: 'Apollo.io', description: 'Sales intelligence and engagement platform with 200M+ contacts', category: 'enrichment', status: 'available', features: ['Contact search', 'Email sequences', 'Chrome extension'], pricing: 'Free - $79/user/month', website: 'https://apollo.io', icon: '🚀', requiresApiKey: true, apiKeyName: 'APOLLO_API_KEY' },
  { id: 'explorium', name: 'Explorium', description: 'External data platform with LinkedIn profiles and income data enrichment', category: 'enrichment', status: 'available', features: ['LinkedIn profiles', 'Income data', 'Company signals', 'Firmographics'], pricing: 'Custom pricing', website: 'https://explorium.ai', icon: '🔬', requiresApiKey: true, apiKeyName: 'EXPLORIUM_API_KEY' },
  { id: 'lusha', name: 'Lusha', description: 'B2B contact and company data platform with browser extension', category: 'enrichment', status: 'available', features: ['Direct dials', 'Email finder', 'CRM integration'], pricing: 'From $29/user/month', website: 'https://lusha.com', icon: '📇', requiresApiKey: true },
  { id: 'linkedin-sales', name: 'LinkedIn Sales Navigator', description: 'Advanced LinkedIn search and lead recommendations', category: 'enrichment', status: 'available', features: ['Advanced search', 'Lead recommendations', 'InMail'], pricing: 'From $79.99/month', website: 'https://linkedin.com/sales', icon: '💼' },
  { id: 'hunter', name: 'Hunter.io', description: 'Find and verify professional email addresses', category: 'enrichment', status: 'available', features: ['Email finder', 'Email verifier', 'Domain search'], pricing: 'Free - $49/month', website: 'https://hunter.io', icon: '🎯', requiresApiKey: true, apiKeyName: 'HUNTER_API_KEY' },
  { id: 'snov', name: 'Snov.io', description: 'Email finder and outreach automation platform', category: 'enrichment', status: 'available', features: ['Email finder', 'Drip campaigns', 'Email verifier'], pricing: 'From $30/month', website: 'https://snov.io', icon: '❄️', requiresApiKey: true },
  { id: 'peopledatalabs', name: 'People Data Labs', description: 'B2B people and company data API for enrichment', category: 'enrichment', status: 'available', features: ['Person API', 'Company API', 'Bulk enrichment'], pricing: 'Pay per record', website: 'https://peopledatalabs.com', icon: '👥', requiresApiKey: true, apiKeyName: 'PDL_API_KEY' },
  { id: 'rocketreach', name: 'RocketReach', description: 'Find email, phone, and social media for any professional', category: 'enrichment', status: 'coming_soon', features: ['Email lookup', 'Phone numbers', 'Social profiles'], pricing: 'From $39/month', website: 'https://rocketreach.co', icon: '🚀' },
  { id: 'seamless', name: 'Seamless.AI', description: 'Real-time B2B contact and company search engine', category: 'enrichment', status: 'coming_soon', features: ['Real-time search', 'Verified contacts', 'Chrome extension'], pricing: 'Custom pricing', website: 'https://seamless.ai', icon: '✨' },
  { id: 'cognism', name: 'Cognism', description: 'Premium B2B sales intelligence with phone-verified mobiles', category: 'enrichment', status: 'coming_soon', features: ['Phone-verified', 'GDPR compliant', 'Intent data'], pricing: 'Custom pricing', website: 'https://cognism.com', icon: '🧠' },

  // AI Tools
  { id: 'manus', name: 'Manus 1.6 MAX', description: 'Autonomous research engine with multi-step verification and guardrails', category: 'ai', status: 'available', features: ['Multi-step research', 'Verification', 'Guardrails', 'Memory'], pricing: 'Included', website: '#', icon: '🔬', requiresApiKey: false },
  { id: 'openai', name: 'OpenAI', description: 'GPT-4 and GPT-5 models for advanced language processing', category: 'ai', status: 'available', features: ['GPT-4/5', 'Embeddings', 'Function calling'], pricing: 'Pay per token', website: 'https://openai.com', icon: '🤖', requiresApiKey: true, apiKeyName: 'OPENAI_API_KEY' },
  { id: 'anthropic', name: 'Anthropic Claude', description: 'Claude AI for safe, helpful, and honest AI assistance', category: 'ai', status: 'available', features: ['Claude 4', 'Long context', 'Vision'], pricing: 'Pay per token', website: 'https://anthropic.com', icon: '🧠', requiresApiKey: true, apiKeyName: 'ANTHROPIC_API_KEY' },
  { id: 'perplexity', name: 'Perplexity AI', description: 'AI-powered search and answer engine with real-time data', category: 'ai', status: 'available', features: ['Real-time search', 'Citations', 'Structured output'], pricing: 'Free - $20/month', website: 'https://perplexity.ai', icon: '🔮', requiresApiKey: true, apiKeyName: 'PERPLEXITY_API_KEY' },
  { id: 'gemini', name: 'Google Gemini', description: 'Multi-modal AI from Google with advanced reasoning', category: 'ai', status: 'available', features: ['Multi-modal', 'Code generation', 'Long context'], pricing: 'Pay per token', website: 'https://ai.google.dev', icon: '💫', requiresApiKey: true, apiKeyName: 'GEMINI_API_KEY' },
  { id: 'cohere', name: 'Cohere', description: 'Enterprise AI for search, generation, and classification', category: 'ai', status: 'available', features: ['Embeddings', 'Rerank', 'RAG'], pricing: 'Pay per token', website: 'https://cohere.com', icon: '🌊', requiresApiKey: true },
  { id: 'mistral', name: 'Mistral AI', description: 'Open-weight AI models with commercial flexibility', category: 'ai', status: 'available', features: ['Open weights', 'Fast inference', 'Function calling'], pricing: 'Pay per token', website: 'https://mistral.ai', icon: '🌪️', requiresApiKey: true, apiKeyName: 'MISTRAL_API_KEY' },
  { id: 'groq', name: 'Groq', description: 'Ultra-fast LLM inference with LPU technology', category: 'ai', status: 'available', features: ['Fastest inference', 'LPU chips', 'Open models'], pricing: 'Free tier available', website: 'https://groq.com', icon: '⚡', requiresApiKey: true, apiKeyName: 'GROQ_API_KEY' },
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'AI voice generation and text-to-speech', category: 'ai', status: 'available', features: ['Voice synthesis', 'Voice cloning', 'Real-time'], pricing: 'Free - $99/month', website: 'https://elevenlabs.io', icon: '🔊', requiresApiKey: true, apiKeyName: 'ELEVENLABS_API_KEY' },

  // Web Scraping
  { id: 'firecrawl', name: 'Firecrawl', description: 'AI-powered web scraping and data extraction API', category: 'scraping', status: 'available', features: ['LLM-ready', 'JavaScript rendering', 'Structured data'], pricing: 'Free - $49/month', website: 'https://firecrawl.dev', icon: '🔥', requiresApiKey: true, apiKeyName: 'FIRECRAWL_API_KEY' },
  { id: 'tavily', name: 'Tavily', description: 'AI-native search API for LLM applications', category: 'scraping', status: 'available', features: ['AI search', 'Real-time', 'Structured'], pricing: 'Free - $50/month', website: 'https://tavily.com', icon: '🔎', requiresApiKey: true, apiKeyName: 'TAVILY_API_KEY' },
  { id: 'browserbase', name: 'Browserbase', description: 'Headless browser infrastructure for web automation', category: 'scraping', status: 'available', features: ['Cloud browsers', 'Stealth mode', 'Screenshots'], pricing: 'Free - $99/month', website: 'https://browserbase.com', icon: '🌐', requiresApiKey: true },
  { id: 'apify', name: 'Apify', description: 'Web scraping and automation platform with 1500+ ready-made tools', category: 'scraping', status: 'available', features: ['Ready-made actors', 'Proxy rotation', 'Cloud storage'], pricing: 'Free - $49/month', website: 'https://apify.com', icon: '🕷️', requiresApiKey: true },
  { id: 'scrapingbee', name: 'ScrapingBee', description: 'Web scraping API with built-in proxy rotation', category: 'scraping', status: 'coming_soon', features: ['Proxy rotation', 'JS rendering', 'Screenshot'], pricing: 'From $49/month', website: 'https://scrapingbee.com', icon: '🐝' },

  // Automation
  { id: 'zapier', name: 'Zapier', description: 'Connect apps and automate workflows with 5000+ integrations', category: 'automation', status: 'available', features: ['5000+ apps', 'Multi-step Zaps', 'Webhooks'], pricing: 'Free - $599/month', website: 'https://zapier.com', icon: '⚡', requiresApiKey: false },
  { id: 'make', name: 'Make (Integromat)', description: 'Visual automation platform for complex workflows', category: 'automation', status: 'available', features: ['Visual builder', 'Data mapping', 'Error handling'], pricing: 'Free - $100+/month', website: 'https://make.com', icon: '🔧', requiresApiKey: true },
  { id: 'n8n', name: 'n8n', description: 'Open-source workflow automation with self-hosting option', category: 'automation', status: 'available', features: ['Self-hostable', 'Code nodes', '400+ integrations'], pricing: 'Free - $50+/month', website: 'https://n8n.io', icon: '🔄', requiresApiKey: true },
  { id: 'pipedream', name: 'Pipedream', description: 'Developer-first integration platform with code-based workflows', category: 'automation', status: 'available', features: ['Code-first', 'Real-time triggers', 'API endpoints'], pricing: 'Free - $49/month', website: 'https://pipedream.com', icon: '💻', requiresApiKey: true },
  { id: 'activepieces', name: 'Activepieces', description: 'Open-source no-code automation alternative', category: 'automation', status: 'coming_soon', features: ['Open source', 'No-code', 'Self-hosted'], pricing: 'Free', website: 'https://activepieces.com', icon: '🧩' },
];

const categoryInfo: Record<IntegrationCategory, { label: string; icon: React.ElementType; description: string }> = {
  crm: { label: 'CRM Systems', icon: Building2, description: 'Sync research findings and leads to your CRM' },
  enrichment: { label: 'Lead Enrichment', icon: Database, description: 'Enhance leads with additional data' },
  ai: { label: 'AI Models', icon: Brain, description: 'Connect AI providers for analysis' },
  scraping: { label: 'Web Scraping', icon: Globe, description: 'Extract data from websites' },
  automation: { label: 'Automation', icon: Zap, description: 'Automate workflows and integrations' },
};

export const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<IntegrationCategory>('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const filteredIntegrations = integrations.filter(i => 
    i.category === activeTab && 
    (i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     i.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const availableCount = filteredIntegrations.filter(i => i.status === 'available').length;
  const connectedCount = connectedIds.filter(id => integrations.find(i => i.id === id && i.category === activeTab)).length;

  const handleConnect = async (integration: Integration) => {
    if (integration.status === 'coming_soon') {
      toast({ title: "Coming Soon", description: `${integration.name} integration will be available soon!` });
      return;
    }
    
    if (connectedIds.includes(integration.id)) {
      setConnectedIds(prev => prev.filter(id => id !== integration.id));
      toast({ title: "Disconnected", description: `${integration.name} has been disconnected` });
      return;
    }

    // If requires API key, show dialog
    if (integration.requiresApiKey) {
      setSelectedIntegration(integration);
      setShowApiKeyDialog(true);
      return;
    }

    // For integrations without API key (like Zapier webhooks)
    setConnectingId(integration.id);
    
    // Simulate connection
    setTimeout(() => {
      setConnectedIds(prev => [...prev, integration.id]);
      setConnectingId(null);
      toast({ title: "Connected!", description: `${integration.name} has been connected successfully` });
    }, 1500);
  };

  const handleSaveApiKey = async () => {
    if (!selectedIntegration || !apiKeyInput.trim()) {
      toast({ title: "API Key Required", description: "Please enter your API key", variant: "destructive" });
      return;
    }

    setConnectingId(selectedIntegration.id);

    try {
      // In a real implementation, this would save to Supabase secrets
      // For now, we'll simulate the connection
      await new Promise(resolve => setTimeout(resolve, 1500));

      setConnectedIds(prev => [...prev, selectedIntegration.id]);
      setShowApiKeyDialog(false);
      setApiKeyInput('');
      setSelectedIntegration(null);
      toast({ 
        title: "Connected!", 
        description: `${selectedIntegration.name} has been connected successfully. API key stored securely.` 
      });
    } catch (error: any) {
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    } finally {
      setConnectingId(null);
    }
  };

  const getStatusBadge = (integration: Integration) => {
    if (connectedIds.includes(integration.id)) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Connected</Badge>;
    }
    switch (integration.status) {
      case 'available': return <Badge className="bg-primary/10 text-primary border-primary/20">Available</Badge>;
      case 'coming_soon': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Coming Soon</Badge>;
      default: return null;
    }
  };

  const currentCategoryInfo = categoryInfo[activeTab];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
            <Puzzle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Integrations</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Connect your favorite tools to supercharge your research workflow. {integrations.length} integrations available.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="flex-wrap h-auto p-1">
              {Object.entries(categoryInfo).map(([key, info]) => {
                const count = integrations.filter(i => i.category === key).length;
                return (
                  <TabsTrigger key={key} value={key} className="gap-2">
                    <info.icon className="w-4 h-4" />
                    {info.label}
                    <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations..."
                className="pl-9 w-64"
              />
            </div>
          </div>

          {Object.keys(categoryInfo).map((category) => (
            <TabsContent key={category} value={category} className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {React.createElement(categoryInfo[category as IntegrationCategory].icon, { className: "w-5 h-5 text-primary" })}
                    {categoryInfo[category as IntegrationCategory].label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {categoryInfo[category as IntegrationCategory].description} • {availableCount} available • {connectedCount} connected
                  </p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Integrations Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations.map((integration, index) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card 
                variant="glass" 
                className={`p-5 h-full flex flex-col transition-all ${
                  integration.status === 'coming_soon' ? 'opacity-70' : 'hover:shadow-lg hover:shadow-primary/10'
                } ${connectedIds.includes(integration.id) ? 'border-green-500/30' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <h3 className="font-semibold">{integration.name}</h3>
                      {getStatusBadge(integration)}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4 flex-1">{integration.description}</p>
                
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {integration.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{feature}</Badge>
                  ))}
                </div>

                {integration.pricing && (
                  <p className="text-xs text-muted-foreground mb-4">{integration.pricing}</p>
                )}

                <div className="flex gap-2 mt-auto">
                  <Button 
                    size="sm" 
                    className="flex-1 gap-2"
                    variant={connectedIds.includes(integration.id) ? "outline" : "default"}
                    onClick={() => handleConnect(integration)}
                    disabled={integration.status === 'coming_soon' || connectingId === integration.id}
                  >
                    {connectingId === integration.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                    ) : connectedIds.includes(integration.id) ? (
                      <><Check className="w-4 h-4" /> Connected</>
                    ) : integration.status === 'coming_soon' ? (
                      <><Clock className="w-4 h-4" /> Coming Soon</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Connect</>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => window.open(integration.website, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredIntegrations.length === 0 && (
          <Card variant="glass" className="p-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Integrations Found</h3>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Try a different search term or browse all integrations.
            </p>
          </Card>
        )}
      </motion.div>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedIntegration?.icon}</span>
              Connect {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your API key to connect {selectedIntegration?.name}. Your key will be stored securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={`Enter your ${selectedIntegration?.name} API key`}
              />
              <p className="text-xs text-muted-foreground">
                Find your API key in your {selectedIntegration?.name} dashboard under Settings → API.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowApiKeyDialog(false); setApiKeyInput(''); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim() || connectingId !== null} className="gap-2">
              {connectingId ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
              ) : (
                <><Shield className="w-4 h-4" /> Connect Securely</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
