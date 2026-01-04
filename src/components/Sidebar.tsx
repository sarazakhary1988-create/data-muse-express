import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Globe, 
  FileText, 
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  Link,
  LayoutTemplate,
  Lightbulb,
  Users,
  Puzzle,
  Search,
  Calendar,
  BarChart3,
  Settings2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { SettingsDialog } from '@/components/SettingsDialog';
import { HelpDialog } from '@/components/HelpDialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export type ViewType = 'search' | 'results' | 'report' | 'history' | 'scraper' | 'scheduled' | 'templates' | 'hypothesis' | 'leads' | 'integrations';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface NavItem {
  id: ViewType;
  labelKey: 'search' | 'templates' | 'urlScraper' | 'hypothesis' | 'leads' | 'scheduled' | 'history' | 'integrations';
  fallbackLabel: string;
  icon: React.ElementType;
  descriptionKey: string;
  badge?: string;
  color: string; // Category color class
}

interface NavSection {
  titleKey: 'research' | 'intelligence' | 'outputs' | 'system';
  fallbackTitle: string;
  color: string; // Section accent color
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    titleKey: 'research',
    fallbackTitle: 'Research',
    color: 'text-purple-500',
    items: [
      { id: 'search', labelKey: 'search', fallbackLabel: 'New Research', icon: Search, descriptionKey: 'Start AI research', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-500/50' },
      { id: 'templates', labelKey: 'templates', fallbackLabel: 'Templates', icon: LayoutTemplate, descriptionKey: 'Pre-built workflows', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-500/50' },
      { id: 'hypothesis', labelKey: 'hypothesis', fallbackLabel: 'Hypothesis Lab', icon: Lightbulb, descriptionKey: 'Test theories', badge: 'AI', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-500/50' },
    ]
  },
  {
    titleKey: 'intelligence',
    fallbackTitle: 'Intelligence',
    color: 'text-blue-500',
    items: [
      { id: 'leads', labelKey: 'leads', fallbackLabel: 'Lead Enrichment', icon: Users, descriptionKey: 'Prospect research', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/50' },
      { id: 'scraper', labelKey: 'urlScraper', fallbackLabel: 'URL Scraper', icon: Link, descriptionKey: 'Extract data', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/50' },
      { id: 'scheduled', labelKey: 'scheduled', fallbackLabel: 'Scheduled', icon: Calendar, descriptionKey: 'Auto research', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/50' },
    ]
  },
  {
    titleKey: 'outputs',
    fallbackTitle: 'Outputs',
    color: 'text-green-500',
    items: [
      { id: 'history', labelKey: 'history', fallbackLabel: 'History', icon: HistoryIcon, descriptionKey: 'Past research', color: 'from-green-500/20 to-green-600/10 border-green-500/30 hover:border-green-500/50' },
    ]
  },
  {
    titleKey: 'system',
    fallbackTitle: 'System',
    color: 'text-orange-500',
    items: [
      { id: 'integrations', labelKey: 'integrations', fallbackLabel: 'Integrations', icon: Puzzle, descriptionKey: 'Connect tools', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 hover:border-orange-500/50' },
    ]
  }
];

export const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, isRTL } = useLanguage();

  // Get translated label for nav items
  const getNavLabel = (item: NavItem) => {
    const key = item.labelKey as keyof typeof t.nav;
    return t.nav[key] || item.fallbackLabel;
  };

  // Get translated section title
  const getSectionTitle = (section: NavSection) => {
    const key = section.titleKey as keyof typeof t.nav;
    return t.nav[key] || section.fallbackTitle;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={{ x: isRTL ? 20 : -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          "flex flex-col h-full bg-card/70 backdrop-blur-2xl border-border/30 transition-all duration-300 relative",
          "shadow-2xl shadow-primary/5",
          isRTL ? "border-l" : "border-r",
          isCollapsed ? "w-[72px]" : "w-72"
        )}
      >
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 opacity-80" />


        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
          {navSections.map((section, sectionIndex) => (
            <div key={section.titleKey}>
              {/* Section Title */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-3"
                  >
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      section.color
                    )}>
                      {getSectionTitle(section)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const isActive = activeView === item.id;
                  const itemLabel = getNavLabel(item);
                  
                  const buttonContent = (
                    <motion.button
                      onClick={() => onViewChange(item.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "w-full relative group transition-all duration-200",
                        isCollapsed ? "p-2.5 rounded-lg" : "p-3 rounded-xl",
                        isActive 
                          ? cn("bg-gradient-to-r", item.color, "border shadow-lg") 
                          : "hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      {/* Active indicator dot */}
                      {isActive && (
                        <motion.div
                          layoutId="activeNavDot"
                          className={cn(
                            "absolute w-2 h-2 rounded-full bg-primary",
                            isCollapsed 
                              ? "top-1 right-1" 
                              : isRTL ? "top-3 left-3" : "top-3 right-3"
                          )}
                          transition={{ type: "spring", bounce: 0.3 }}
                        />
                      )}

                      <div className={cn(
                        "flex items-center gap-3",
                        isCollapsed && "justify-center"
                      )}>
                        <motion.div
                          animate={{ 
                            scale: isActive ? 1.1 : 1,
                            rotate: isActive ? [0, -10, 10, 0] : 0 
                          }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "flex-shrink-0 transition-transform",
                            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                        </motion.div>
                        
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="flex flex-col items-start overflow-hidden flex-1"
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-sm font-medium",
                                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                  {itemLabel}
                                </span>
                                {item.badge && (
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      "px-1.5 py-0 text-[9px] font-bold",
                                      isActive 
                                        ? "bg-primary/20 text-primary border-primary/30" 
                                        : "bg-primary/10 text-primary"
                                    )}
                                  >
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <span className={cn(
                                "text-[10px] truncate",
                                isActive ? "text-muted-foreground" : "text-muted-foreground/60"
                              )}>
                                {item.descriptionKey}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Arrow indicator on hover */}
                        {!isCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -5 }}
                            className="text-muted-foreground group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );

                  // Wrap in tooltip when collapsed
                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          {buttonContent}
                        </TooltipTrigger>
                        <TooltipContent side={isRTL ? "left" : "right"} className="flex flex-col">
                          <span className="font-medium">{itemLabel}</span>
                          <span className="text-xs text-muted-foreground">{item.descriptionKey}</span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={item.id}>{buttonContent}</div>;
                })}
              </div>

              {/* Section separator */}
              {sectionIndex < navSections.length - 1 && !isCollapsed && (
                <Separator className="mt-5 opacity-30" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer - Only Settings and Help, no Theme/Language */}
        <div className="p-3 border-t border-border/30 space-y-1">
          <SettingsDialog collapsed={isCollapsed} />
          <HelpDialog collapsed={isCollapsed} />
          
          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "w-full mt-2 h-9 transition-all duration-200",
              "hover:bg-muted/50"
            )}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              {isRTL ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </motion.div>
            {!isCollapsed && (
              <span className={cn("text-xs", isRTL ? "mr-2" : "ml-2")}>
                {t.common.close}
              </span>
            )}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
};
