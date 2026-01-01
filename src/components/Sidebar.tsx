import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Globe, 
  FileText, 
  ChevronLeft,
  ChevronRight,
  Sparkles,
  History as HistoryIcon,
  Link,
  LayoutTemplate,
  Lightbulb,
  Users,
  Puzzle,
  Search,
  Calendar,
  BarChart3,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsDialog } from '@/components/SettingsDialog';
import { HelpDialog } from '@/components/HelpDialog';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Separator } from '@/components/ui/separator';
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
}

interface NavSection {
  titleKey: 'research' | 'intelligence' | 'outputs' | 'system';
  fallbackTitle: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    titleKey: 'research',
    fallbackTitle: 'Research',
    items: [
      { id: 'search', labelKey: 'search', fallbackLabel: 'New Research', icon: Search, descriptionKey: 'Start AI research' },
      { id: 'templates', labelKey: 'templates', fallbackLabel: 'Templates', icon: LayoutTemplate, descriptionKey: 'Pre-built workflows' },
      { id: 'hypothesis', labelKey: 'hypothesis', fallbackLabel: 'Hypothesis Lab', icon: Lightbulb, descriptionKey: 'Test theories', badge: 'AI' },
    ]
  },
  {
    titleKey: 'intelligence',
    fallbackTitle: 'Intelligence',
    items: [
      { id: 'leads', labelKey: 'leads', fallbackLabel: 'Lead Enrichment', icon: Users, descriptionKey: 'Prospect research' },
      { id: 'scraper', labelKey: 'urlScraper', fallbackLabel: 'URL Scraper', icon: Link, descriptionKey: 'Extract data' },
      { id: 'scheduled', labelKey: 'scheduled', fallbackLabel: 'Scheduled', icon: Calendar, descriptionKey: 'Auto research' },
    ]
  },
  {
    titleKey: 'outputs',
    fallbackTitle: 'Outputs',
    items: [
      { id: 'history', labelKey: 'history', fallbackLabel: 'History', icon: HistoryIcon, descriptionKey: 'Past research' },
    ]
  },
  {
    titleKey: 'system',
    fallbackTitle: 'System',
    items: [
      { id: 'integrations', labelKey: 'integrations', fallbackLabel: 'Integrations', icon: Puzzle, descriptionKey: 'Connect tools' },
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
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary opacity-60" />

      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex justify-center"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 10 : -10 }}
            >
              <Logo />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section, sectionIndex) => (
          <div key={section.titleKey}>
            {/* Section Title */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 mb-2"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {getSectionTitle(section)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeView === item.id;
                const itemLabel = getNavLabel(item);
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "w-full justify-start gap-3 h-11 transition-all duration-200 relative group",
                      isCollapsed && "justify-center px-0",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary hover:text-primary-foreground" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && !isCollapsed && (
                      <motion.div
                        layoutId="activeIndicator"
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground",
                          isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"
                        )}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    <item.icon className={cn(
                      "w-4 h-4 flex-shrink-0 transition-transform duration-200",
                      !isActive && "group-hover:scale-110"
                    )} />
                    
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex flex-col items-start overflow-hidden flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{itemLabel}</span>
                            {item.badge && (
                              <span className={cn(
                                "px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full",
                                isActive 
                                  ? "bg-primary-foreground/20 text-primary-foreground" 
                                  : "bg-primary/10 text-primary"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] truncate",
                            isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {item.descriptionKey}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className={cn(
                        "absolute ml-2 px-2 py-1 bg-popover border border-border rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap",
                        isRTL ? "right-full mr-2" : "left-full ml-2"
                      )}>
                        <span className="text-xs font-medium">{itemLabel}</span>
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Section separator */}
            {sectionIndex < navSections.length - 1 && !isCollapsed && (
              <Separator className="mt-4 opacity-30" />
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/30 space-y-1">
        <LanguageSwitcher compact={isCollapsed} />
        <ThemeToggle collapsed={isCollapsed} />
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
          {isCollapsed ? (
            isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              {isRTL ? <ChevronRight className="w-4 h-4 ml-2" /> : <ChevronLeft className="w-4 h-4 mr-2" />}
              <span className="text-xs">{t.common.close}</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
};
