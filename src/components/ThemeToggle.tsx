import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle = ({ collapsed = false }: { collapsed?: boolean }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={collapsed ? "w-full justify-center px-0" : "w-full justify-start gap-3"}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-5 h-5" />
          {!collapsed && <span>Light Mode</span>}
        </>
      ) : (
        <>
          <Moon className="w-5 h-5" />
          {!collapsed && <span>Dark Mode</span>}
        </>
      )}
    </Button>
  );
};
