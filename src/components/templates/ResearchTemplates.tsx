import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, TrendingUp, Users, Globe, BookOpen, Newspaper, 
  DollarSign, Search, Briefcase, Scale, ArrowRight, Sparkles,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  depth: 'Deep' | 'Wide';
  fields: { name: string; label: string; placeholder: string; type?: 'text' | 'textarea' }[];
  promptTemplate: string;
}

const templates: Template[] = [
  {
    id: 'competitor-analysis',
    name: 'Competitor Analysis',
    description: 'Deep dive into competitor strategies, products, and market positioning',
    icon: Building2,
    category: 'Business Intelligence',
    depth: 'Deep',
    fields: [
      { name: 'company', label: 'Your Company', placeholder: 'e.g., Apple' },
      { name: 'competitors', label: 'Competitors', placeholder: 'e.g., Samsung, Google, Microsoft' },
      { name: 'focus', label: 'Focus Areas', placeholder: 'e.g., pricing, features, market share' },
    ],
    promptTemplate: 'Conduct a comprehensive competitor analysis for {company} against {competitors}. Focus on: {focus}. Include market positioning, product comparison, pricing strategies, and competitive advantages.',
  },
  {
    id: 'market-research',
    name: 'Market Research',
    description: 'Analyze market trends, size, growth, and key players',
    icon: TrendingUp,
    category: 'Business Intelligence',
    depth: 'Wide',
    fields: [
      { name: 'market', label: 'Market/Industry', placeholder: 'e.g., Electric Vehicles' },
      { name: 'region', label: 'Geographic Region', placeholder: 'e.g., North America, Global' },
      { name: 'timeframe', label: 'Time Horizon', placeholder: 'e.g., 2024-2030' },
    ],
    promptTemplate: 'Research the {market} market in {region}. Analyze market size, growth projections for {timeframe}, key players, trends, challenges, and opportunities.',
  },
  {
    id: 'company-deep-dive',
    name: 'Company Deep Dive',
    description: 'Comprehensive company research with financials and leadership',
    icon: Briefcase,
    category: 'Business Intelligence',
    depth: 'Deep',
    fields: [
      { name: 'company', label: 'Company Name', placeholder: 'e.g., Tesla Inc.' },
      { name: 'aspects', label: 'Research Aspects', placeholder: 'e.g., financials, leadership, strategy' },
    ],
    promptTemplate: 'Conduct a comprehensive deep dive on {company}. Research: {aspects}. Include company history, business model, financial performance, leadership team, competitive position, and future outlook.',
  },
  {
    id: 'due-diligence',
    name: 'Due Diligence',
    description: 'Comprehensive due diligence for M&A or partnerships',
    icon: Scale,
    category: 'Business Intelligence',
    depth: 'Deep',
    fields: [
      { name: 'target', label: 'Target Company', placeholder: 'e.g., Startup XYZ' },
      { name: 'purpose', label: 'Purpose', placeholder: 'e.g., acquisition, investment, partnership' },
      { name: 'concerns', label: 'Key Concerns', placeholder: 'e.g., legal, financial, operational risks' },
    ],
    promptTemplate: 'Perform due diligence on {target} for {purpose}. Investigate: {concerns}. Include financial health, legal issues, market position, team assessment, and risk factors.',
  },
  {
    id: 'investment-research',
    name: 'Investment Research',
    description: 'Analyze investment opportunities with risk assessment',
    icon: DollarSign,
    category: 'Finance',
    depth: 'Deep',
    fields: [
      { name: 'asset', label: 'Investment Asset', placeholder: 'e.g., NVIDIA stock, Bitcoin' },
      { name: 'horizon', label: 'Investment Horizon', placeholder: 'e.g., 1 year, 5 years' },
      { name: 'criteria', label: 'Evaluation Criteria', placeholder: 'e.g., growth potential, risk level' },
    ],
    promptTemplate: 'Research {asset} as an investment opportunity for a {horizon} horizon. Evaluate based on: {criteria}. Include fundamental analysis, technical indicators, risk assessment, and price targets.',
  },
  {
    id: 'talent-leadership',
    name: 'Talent & Leadership',
    description: 'Research executives, founders, and industry leaders',
    icon: Users,
    category: 'People',
    depth: 'Deep',
    fields: [
      { name: 'person', label: 'Person Name', placeholder: 'e.g., Satya Nadella' },
      { name: 'context', label: 'Context', placeholder: 'e.g., CEO of Microsoft, AI strategy' },
    ],
    promptTemplate: 'Research {person} ({context}). Include career history, achievements, leadership style, public statements, strategic decisions, and industry influence.',
  },
  {
    id: 'industry-trends',
    name: 'Industry Trends',
    description: 'Identify emerging trends and disruptions in any industry',
    icon: TrendingUp,
    category: 'Strategy',
    depth: 'Wide',
    fields: [
      { name: 'industry', label: 'Industry', placeholder: 'e.g., Healthcare, FinTech' },
      { name: 'timeframe', label: 'Timeframe', placeholder: 'e.g., 2024-2025' },
    ],
    promptTemplate: 'Identify and analyze emerging trends in the {industry} industry for {timeframe}. Include technology disruptions, regulatory changes, consumer behavior shifts, and key innovations.',
  },
  {
    id: 'global-expansion',
    name: 'Global Expansion',
    description: 'Research new markets for international expansion',
    icon: Globe,
    category: 'Strategy',
    depth: 'Deep',
    fields: [
      { name: 'company', label: 'Company', placeholder: 'e.g., Your Company' },
      { name: 'targetMarket', label: 'Target Market', placeholder: 'e.g., Japan, Brazil' },
      { name: 'product', label: 'Product/Service', placeholder: 'e.g., SaaS platform' },
    ],
    promptTemplate: 'Research market entry strategy for {company} expanding to {targetMarket} with {product}. Include market size, regulations, cultural factors, competition, and entry barriers.',
  },
  {
    id: 'academic-research',
    name: 'Academic Research',
    description: 'Literature review and academic paper analysis',
    icon: BookOpen,
    category: 'Academic',
    depth: 'Deep',
    fields: [
      { name: 'topic', label: 'Research Topic', placeholder: 'e.g., Machine Learning in Healthcare' },
      { name: 'focus', label: 'Focus Area', placeholder: 'e.g., diagnostic accuracy, patient outcomes' },
    ],
    promptTemplate: 'Conduct an academic literature review on {topic}. Focus on: {focus}. Include key papers, methodologies, findings, gaps in research, and future directions.',
  },
  {
    id: 'news-analysis',
    name: 'News & Events Analysis',
    description: 'Analyze news events and their implications',
    icon: Newspaper,
    category: 'Current Events',
    depth: 'Wide',
    fields: [
      { name: 'event', label: 'Event/Topic', placeholder: 'e.g., Fed interest rate decision' },
      { name: 'impact', label: 'Impact Analysis', placeholder: 'e.g., stock market, consumer spending' },
    ],
    promptTemplate: 'Analyze {event} and its implications. Focus on: {impact}. Include background, key stakeholders, short-term and long-term effects, and market reactions.',
  },
];

const categories = [...new Set(templates.map(t => t.category))];

interface ResearchTemplatesProps {
  onUseTemplate: (prompt: string) => void;
}

export const ResearchTemplates = ({ onUseTemplate }: ResearchTemplatesProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const filteredTemplates = selectedCategory 
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;
    
    let prompt = selectedTemplate.promptTemplate;
    selectedTemplate.fields.forEach(field => {
      prompt = prompt.replace(`{${field.name}}`, formData[field.name] || field.placeholder);
    });
    
    onUseTemplate(prompt);
    setSelectedTemplate(null);
    setFormData({});
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Business Intelligence': return Building2;
      case 'Finance': return DollarSign;
      case 'People': return Users;
      case 'Strategy': return Globe;
      case 'Academic': return BookOpen;
      case 'Current Events': return Newspaper;
      default: return Search;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Research Templates</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pre-built research workflows designed by experts. Select a template, fill in the details, and let AI do the research.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(category => {
            const Icon = getCategoryIcon(category);
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {category}
              </Button>
            );
          })}
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                variant="glass" 
                className="p-5 h-full flex flex-col hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group"
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <template.icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant={template.depth === 'Deep' ? 'default' : 'secondary'}>
                    {template.depth}
                  </Badge>
                </div>
                <h3 className="font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground flex-1">{template.description}</p>
                <Button variant="ghost" size="sm" className="mt-4 w-full justify-between group-hover:text-primary">
                  Use Template
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Template Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && <selectedTemplate.icon className="w-5 h-5 text-primary" />}
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedTemplate?.fields.map(field => (
              <div key={field.name} className="space-y-2">
                <Label>{field.label}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <Input
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>Cancel</Button>
            <Button onClick={handleUseTemplate} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Start Research
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
