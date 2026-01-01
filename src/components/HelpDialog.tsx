import { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  FileText, 
  Link, 
  Calendar, 
  History, 
  Zap,
  Shield,
  Globe,
  CheckCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface HelpDialogProps {
  collapsed?: boolean;
}

const features = [
  {
    icon: Search,
    title: 'AI-Powered Research',
    description: 'Enter any research query and our AI will search across multiple sources to find relevant information.',
  },
  {
    icon: Globe,
    title: 'Embedded Web Search',
    description: 'Uses DuckDuckGo, Google, and Bing directly without external API dependencies.',
  },
  {
    icon: Link,
    title: 'URL Scraper',
    description: 'Extract and analyze content from any website URL directly.',
  },
  {
    icon: Calendar,
    title: 'Scheduled Tasks',
    description: 'Set up automated research tasks that run on a schedule (daily, weekly, monthly).',
  },
  {
    icon: FileText,
    title: 'Report Generation',
    description: 'Generate comprehensive research reports in multiple formats.',
  },
  {
    icon: Shield,
    title: 'Verification System',
    description: 'Cross-reference findings across sources to identify discrepancies.',
  },
];

const tips = [
  {
    icon: Zap,
    title: 'Be Specific',
    tip: 'Include specific details like company names, dates, or regions for better results.',
  },
  {
    icon: CheckCircle,
    title: 'Use AI Enhancer',
    tip: 'Enable the AI Enhancer toggle to optimize your research queries automatically.',
  },
  {
    icon: History,
    title: 'Check History',
    tip: 'Access previous research from the History tab to avoid duplicate work.',
  },
];

export const HelpDialog = ({ collapsed = false }: HelpDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            collapsed && "justify-center px-0"
          )}
        >
          <HelpCircle className="w-5 h-5" />
          {!collapsed && <span>Help</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Help & Documentation
          </DialogTitle>
          <DialogDescription>
            Learn how to use the MANUS Research Engine
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="features" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="features">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4 py-2">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tips">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <h4 className="text-sm font-medium text-primary mb-2">Getting Started</h4>
                  <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Enter your research query in the search box</li>
                    <li>Optionally enable AI Enhancement for better results</li>
                    <li>Wait for the research to complete</li>
                    <li>Review sources and generate a report</li>
                  </ol>
                </div>

                {tips.map((tip, index) => (
                  <div 
                    key={index}
                    className="flex gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-shrink-0">
                      <tip.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{tip.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tip.tip}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-lg border border-border">
                  <h4 className="text-sm font-medium mb-2">Keyboard Shortcuts</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> - Start research</p>
                    <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> - Close dialogs</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
