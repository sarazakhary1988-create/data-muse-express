import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Globe, 
  ChevronDown,
  BarChart3,
  Keyboard,
  Newspaper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage, Language } from '@/lib/i18n/LanguageContext';
import { useResearchStore } from '@/store/researchStore';
import { NewsFilter, useNewsFilterState } from '@/components/NewsRibbon';
import { cn } from '@/lib/utils';

interface TopNavigationProps {
  className?: string;
  newsFilterState?: ReturnType<typeof useNewsFilterState>;
}

export const TopNavigation = ({ className, newsFilterState }: TopNavigationProps) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { tasks, reports } = useResearchStore();
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Use provided filter state or create local one
  const localFilterState = useNewsFilterState();
  const filterState = newsFilterState || localFilterState;

  const themeOptions = [
    { value: 'light', label: t.common.light, icon: Sun },
    { value: 'dark', label: t.common.dark, icon: Moon },
    { value: 'system', label: t.common.system, icon: Monitor },
  ];

  const languages: { code: Language; label: string; nativeLabel: string }[] = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  ];

  const currentLang = languages.find(l => l.code === language);

  // Stats
  const totalQueries = tasks.length;
  const totalReports = reports.length;

  const shortcuts = [
    { keys: ['/', 'Ctrl+K'], description: t.help.focusSearch },
    { keys: ['?'], description: t.help.showShortcuts },
    { keys: ['Esc'], description: t.help.escToClose },
    { keys: ['Ctrl+Enter'], description: t.search.startResearch },
    { keys: ['H'], description: t.help.goToHistory },
    { keys: ['N'], description: t.help.newResearch },
  ];

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowKeyboardShortcuts(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header 
        className={cn(
          "h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40",
          "flex items-center justify-between px-4 md:px-6",
          className
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Left: Breadcrumb / Title */}
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <span className="text-sm font-medium text-muted-foreground">
            {t.common.home}
          </span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-semibold">{t.common.researchEngine}</span>
        </div>

        {/* Center: News Filter */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border/50">
            <Newspaper className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">News:</span>
            <NewsFilter filterState={filterState} />
          </div>
        </div>

        {/* Right: Stats + Controls */}
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          {/* Research Stats Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50",
              isRTL && "flex-row-reverse"
            )}
          >
            <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">{totalQueries}</span>
              <span className="text-[10px] text-muted-foreground">{t.common.queries}</span>
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
              <span className="text-xs font-medium">{totalReports}</span>
              <span className="text-[10px] text-muted-foreground">{t.common.reports}</span>
            </div>
          </motion.div>

          {/* Keyboard Shortcuts Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyboardShortcuts(true)}
            className={cn(
              "hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground",
              isRTL && "flex-row-reverse"
            )}
          >
            <Keyboard className="w-4 h-4" />
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd>
          </Button>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={cn("gap-1.5", isRTL && "flex-row-reverse")}>
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{currentLang?.nativeLabel}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-36">
              <DropdownMenuLabel className="text-xs">{t.common.language}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    language === lang.code && "bg-primary/10 text-primary"
                  )}
                >
                  <span>{lang.nativeLabel}</span>
                  {language === lang.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-9 h-9">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={theme}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    {theme === 'dark' ? (
                      <Moon className="w-4 h-4" />
                    ) : theme === 'light' ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Monitor className="w-4 h-4" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-36">
              <DropdownMenuLabel className="text-xs">{t.common.theme}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {themeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    theme === option.value && "bg-primary/10 text-primary"
                  )}
                >
                  <option.icon className="w-4 h-4" />
                  <span>{option.label}</span>
                  {theme === option.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn("w-2 h-2 rounded-full bg-primary", isRTL ? "mr-auto" : "ml-auto")}
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Keyboard className="w-5 h-5" />
              {t.common.keyboardShortcuts}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? 'استخدم هذه الاختصارات للتنقل بشكل أسرع' : 'Use these shortcuts to navigate faster'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {shortcuts.map((shortcut, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg bg-muted/50",
                  isRTL && "flex-row-reverse"
                )}
              >
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                  {shortcut.keys.map((key, i) => (
                    <span key={i} className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                      {i > 0 && <span className="text-xs text-muted-foreground mx-1">{isRTL ? 'أو' : 'or'}</span>}
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
