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
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface HelpDialogProps {
  collapsed?: boolean;
}

export const HelpDialog = ({ collapsed = false }: HelpDialogProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const features = [
    {
      icon: Search,
      title: t.help.featuresList.aiResearch,
      description: t.help.featuresList.aiResearchDesc,
    },
    {
      icon: Globe,
      title: t.help.featuresList.embeddedSearch,
      description: t.help.featuresList.embeddedSearchDesc,
    },
    {
      icon: Link,
      title: t.help.featuresList.urlScraper,
      description: t.help.featuresList.urlScraperDesc,
    },
    {
      icon: Calendar,
      title: t.help.featuresList.scheduledTasks,
      description: t.help.featuresList.scheduledTasksDesc,
    },
    {
      icon: FileText,
      title: t.help.featuresList.reportGeneration,
      description: t.help.featuresList.reportGenerationDesc,
    },
    {
      icon: Shield,
      title: t.help.featuresList.verification,
      description: t.help.featuresList.verificationDesc,
    },
  ];

  const tips = [
    {
      icon: Zap,
      title: t.help.tipsList.beSpecific,
      tip: t.help.tipsList.beSpecificDesc,
    },
    {
      icon: CheckCircle,
      title: t.help.tipsList.useEnhancer,
      tip: t.help.tipsList.useEnhancerDesc,
    },
    {
      icon: History,
      title: t.help.tipsList.checkHistory,
      tip: t.help.tipsList.checkHistoryDesc,
    },
  ];

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
          {!collapsed && <span>{t.common.help}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            {t.help.title}
          </DialogTitle>
          <DialogDescription>
            {t.help.subtitle}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="features" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="features">{t.help.features}</TabsTrigger>
            <TabsTrigger value="tips">{t.help.tips}</TabsTrigger>
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
                  <h4 className="text-sm font-medium text-primary mb-2">{t.help.gettingStarted}</h4>
                  <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>{t.help.steps.step1}</li>
                    <li>{t.help.steps.step2}</li>
                    <li>{t.help.steps.step3}</li>
                    <li>{t.help.steps.step4}</li>
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
                  <h4 className="text-sm font-medium mb-2">{t.help.keyboardShortcuts}</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> - {t.help.enterToSearch}</p>
                    <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> - {t.help.escToClose}</p>
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
