import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Puzzle, ExternalLink, Check, Clock, Search,
  Database, Users, Zap, Building2, Mail, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'enrichment';
  status: 'available' | 'coming_soon' | 'connected';
  features: string[];
  pricing?: string;
  website: string;
  icon: string;
}

const integrations: Integration[] = [
  // CRM Systems
  { id: 'salesforce', name: 'Salesforce', description: "World's #1 CRM platform with comprehensive sales, service, and marketing automation", category: 'crm', status: 'available', features: ['Contact sync', 'Lead scoring', 'Pipeline integration'], pricing: 'From $25/user/month', website: 'https://salesforce.com', icon: '☁️' },
  { id: 'hubspot', name: 'HubSpot', description: 'All-in-one inbound marketing, sales, and CRM platform for growing businesses', category: 'crm', status: 'available', features: ['Deal tracking', 'Email integration', 'Marketing automation'], pricing: 'Free - $1,200/month', website: 'https://hubspot.com', icon: '🧡' },
  { id: 'pipedrive', name: 'Pipedrive', description: 'Sales CRM designed by salespeople for salespeople with visual pipeline management', category: 'crm', status: 'available', features: ['Visual pipeline', 'Activity tracking', 'Email sync'], pricing: 'From $14.90/user/month', website: 'https://pipedrive.com', icon: '🎯' },
  { id: 'zoho', name: 'Zoho CRM', description: 'Comprehensive CRM with AI-powered sales assistant and multichannel support', category: 'crm', status: 'available', features: ['AI assistant', 'Multichannel', 'Workflow automation'], pricing: 'From $14/user/month', website: 'https://zoho.com/crm', icon: '🔶' },
  { id: 'dynamics365', name: 'Microsoft Dynamics 365', description: 'Enterprise-grade CRM with deep Microsoft ecosystem integration', category: 'crm', status: 'available', features: ['Microsoft 365 integration', 'Power BI', 'Teams collaboration'], pricing: 'From $65/user/month', website: 'https://dynamics.microsoft.com', icon: '🪟' },
  { id: 'close', name: 'Close', description: 'Sales CRM built for high-velocity sales teams with built-in calling', category: 'crm', status: 'available', features: ['Built-in calling', 'Email sequences', 'Pipeline view'], pricing: 'From $49/user/month', website: 'https://close.com', icon: '📞' },
  { id: 'freshsales', name: 'Freshsales', description: 'AI-powered CRM with built-in phone, email, chat and telephony', category: 'crm', status: 'available', features: ['AI scoring', 'Built-in phone', 'Email tracking'], pricing: 'From $15/user/month', website: 'https://freshsales.io', icon: '🌱' },
  { id: 'copper', name: 'Copper', description: 'CRM designed for Google Workspace with automatic data capture', category: 'crm', status: 'available', features: ['Google Workspace', 'Auto data capture', 'Pipeline management'], pricing: 'From $23/user/month', website: 'https://copper.com', icon: '🟤' },
  { id: 'monday', name: 'Monday Sales CRM', description: 'Customizable CRM on the Monday.com Work OS platform', category: 'crm', status: 'coming_soon', features: ['Customizable', 'Automations', 'Integrations'], pricing: 'From $10/seat/month', website: 'https://monday.com/crm', icon: '📊' },
  { id: 'notion', name: 'Notion', description: 'All-in-one workspace with CRM templates and database features', category: 'crm', status: 'coming_soon', features: ['Flexible databases', 'Templates', 'Team collaboration'], pricing: 'From $8/user/month', website: 'https://notion.so', icon: '📝' },
  
  // Lead Enrichment
  { id: 'clearbit', name: 'Clearbit', description: 'Real-time B2B data enrichment and lead intelligence', category: 'enrichment', status: 'available', features: ['Company data', 'Contact enrichment', 'Real-time API'], pricing: 'Custom pricing', website: 'https://clearbit.com', icon: '💎' },
  { id: 'zoominfo', name: 'ZoomInfo', description: 'Comprehensive B2B database with contact and company intelligence', category: 'enrichment', status: 'available', features: ['Contact database', 'Intent data', 'Org charts'], pricing: 'Custom pricing', website: 'https://zoominfo.com', icon: '🔍' },
  { id: 'apollo', name: 'Apollo.io', description: 'Sales intelligence and engagement platform with 200M+ contacts', category: 'enrichment', status: 'available', features: ['Contact search', 'Email sequences', 'Chrome extension'], pricing: 'Free - $79/user/month', website: 'https://apollo.io', icon: '🚀' },
  { id: 'lusha', name: 'Lusha', description: 'B2B contact and company data platform with browser extension', category: 'enrichment', status: 'available', features: ['Direct dials', 'Email finder', 'CRM integration'], pricing: 'From $29/user/month', website: 'https://lusha.com', icon: '📇' },
  { id: 'linkedin-sales', name: 'LinkedIn Sales Navigator', description: 'Advanced LinkedIn search and lead recommendations', category: 'enrichment', status: 'available', features: ['Advanced search', 'Lead recommendations', 'InMail'], pricing: 'From $79.99/month', website: 'https://linkedin.com/sales', icon: '💼' },
  { id: 'hunter', name: 'Hunter.io', description: 'Find and verify professional email addresses', category: 'enrichment', status: 'available', features: ['Email finder', 'Email verifier', 'Domain search'], pricing: 'Free - $49/month', website: 'https://hunter.io', icon: '🎯' },
  { id: 'snov', name: 'Snov.io', description: 'Email finder and outreach automation platform', category: 'enrichment', status: 'available', features: ['Email finder', 'Drip campaigns', 'Email verifier'], pricing: 'From $30/month', website: 'https://snov.io', icon: '❄️' },
  { id: 'rocketreach', name: 'RocketReach', description: 'Find email, phone, and social media for any professional', category: 'enrichment', status: 'coming_soon', features: ['Email lookup', 'Phone numbers', 'Social profiles'], pricing: 'From $39/month', website: 'https://rocketreach.co', icon: '🚀' },
  { id: 'seamless', name: 'Seamless.AI', description: 'Real-time B2B contact and company search engine', category: 'enrichment', status: 'coming_soon', features: ['Real-time search', 'Verified contacts', 'Chrome extension'], pricing: 'Custom pricing', website: 'https://seamless.ai', icon: '✨' },
  { id: 'cognism', name: 'Cognism', description: 'Premium B2B sales intelligence with phone-verified mobiles', category: 'enrichment', status: 'coming_soon', features: ['Phone-verified', 'GDPR compliant', 'Intent data'], pricing: 'Custom pricing', website: 'https://cognism.com', icon: '🧠' },
];

export const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<'crm' | 'enrichment'>('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  const filteredIntegrations = integrations.filter(i => 
    i.category === activeTab && 
    (i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     i.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const availableCount = filteredIntegrations.filter(i => i.status === 'available').length;

  const handleConnect = (integration: Integration) => {
    if (integration.status === 'coming_soon') {
      toast({ title: "Coming Soon", description: `${integration.name} integration will be available soon!` });
      return;
    }
    
    if (connectedIds.includes(integration.id)) {
      setConnectedIds(prev => prev.filter(id => id !== integration.id));
      toast({ title: "Disconnected", description: `${integration.name} has been disconnected` });
    } else {
      setConnectedIds(prev => [...prev, integration.id]);
      toast({ title: "Connected!", description: `${integration.name} has been connected successfully` });
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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <Puzzle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Integrations</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Connect your CRM and data enrichment tools to sync research findings and enriched leads.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList>
              <TabsTrigger value="crm" className="gap-2">
                <Building2 className="w-4 h-4" />
                CRM Systems ({integrations.filter(i => i.category === 'crm').length})
              </TabsTrigger>
              <TabsTrigger value="enrichment" className="gap-2">
                <Database className="w-4 h-4" />
                Lead Enrichment ({integrations.filter(i => i.category === 'enrichment').length})
              </TabsTrigger>
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

          <TabsContent value="crm" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">CRM Integrations</h2>
              <p className="text-sm text-muted-foreground">
                Sync your research findings and enriched leads directly to your CRM • {availableCount} available
              </p>
            </div>
          </TabsContent>

          <TabsContent value="enrichment" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Lead Enrichment Tools</h2>
              <p className="text-sm text-muted-foreground">
                Connect data enrichment services to enhance your lead intelligence • {availableCount} available
              </p>
            </div>
          </TabsContent>
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
                className={`p-5 h-full flex flex-col ${
                  integration.status === 'coming_soon' ? 'opacity-70' : ''
                }`}
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
                    disabled={integration.status === 'coming_soon'}
                  >
                    {connectedIds.includes(integration.id) ? (
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
    </div>
  );
};
