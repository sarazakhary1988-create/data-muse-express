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
  Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsDialog } from '@/components/SettingsDialog';
import { HelpDialog } from '@/components/HelpDialog';
import { cn } from '@/lib/utils';

export type ViewType = 'search' | 'results' | 'report' | 'history' | 'scraper' | 'scheduled';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const menuItems = [
  { id: 'search', label: 'Research', icon: Globe, description: 'Start new research' },
  { id: 'scheduled', label: 'Scheduled Tasks', icon: Sparkles, description: 'Automated research' },
  { id: 'scraper', label: 'URL Scraper', icon: Link, description: 'Scrape any website' },
  { id: 'results', label: 'Results', icon: Layers, description: 'View findings' },
  { id: 'report', label: 'Reports', icon: FileText, description: 'Generated reports' },
  { id: 'history', label: 'History', icon: HistoryIcon, description: 'Past research' },
] as const;

export const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "flex flex-col h-full bg-card/60 backdrop-blur-2xl border-r border-border/40 transition-all duration-300",
        "shadow-xl shadow-primary/5",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Logo />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              onClick={() => onViewChange(item.id as ViewType)}
              className={cn(
                "w-full justify-start gap-3 h-12 transition-all",
                isCollapsed && "justify-center px-0",
                isActive && "shadow-lg shadow-primary/20"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary-foreground")} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex flex-col items-start overflow-hidden"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className={cn(
                      "text-xs truncate",
                      isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-1">
        <ThemeToggle collapsed={isCollapsed} />
        <SettingsDialog collapsed={isCollapsed} />
        <HelpDialog collapsed={isCollapsed} />
        
        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full mt-2"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
};
