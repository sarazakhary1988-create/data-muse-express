import { Bell, BellOff, Volume2, VolumeX, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { NewsCategory } from '@/hooks/useNewsMonitor';
import { cn } from '@/lib/utils';

const CATEGORY_OPTIONS: { value: NewsCategory; label: string; emoji: string }[] = [
  { value: 'ipo', label: 'IPO Announcements', emoji: '🚀' },
  { value: 'cma_violation', label: 'CMA Violations', emoji: '⚠️' },
  { value: 'acquisition', label: 'Acquisitions', emoji: '🤝' },
  { value: 'contract', label: 'Contract Awards', emoji: '📄' },
  { value: 'vision_2030', label: 'Vision 2030', emoji: '🎯' },
  { value: 'tech_funding', label: 'Tech Funding', emoji: '💰' },
  { value: 'banking', label: 'Banking Sector', emoji: '🏦' },
  { value: 'appointment', label: 'Appointments', emoji: '👤' },
];

export function NewsNotificationSettings() {
  const {
    permission,
    settings,
    isSupported,
    requestPermission,
    toggleNotifications,
    toggleCategory,
    toggleSound,
  } = useNewsNotifications();

  if (!isSupported) {
    return (
      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
        <BellOff className="w-4 h-4" />
        <span>Browser notifications are not supported</span>
      </div>
    );
  }

  const isBlocked = permission === 'denied';
  const isEnabled = settings.enabled && permission === 'granted';

  return (
    <div className="space-y-4">
      {/* Permission Status */}
      {isBlocked && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 text-destructive" />
          <span className="text-destructive">
            Notifications are blocked. Please enable them in your browser settings.
          </span>
        </div>
      )}

      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell className="w-4 h-4 text-primary" />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="notifications-toggle" className="font-medium">
              Push Notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Get notified for high-priority news
            </p>
          </div>
        </div>
        <Switch
          id="notifications-toggle"
          checked={isEnabled}
          disabled={isBlocked}
          onCheckedChange={async (checked) => {
            if (checked && permission === 'default') {
              await requestPermission();
            } else {
              await toggleNotifications(checked);
            }
          }}
        />
      </div>

      {isEnabled && (
        <>
          {/* Sound Toggle */}
          <div className="flex items-center justify-between pl-7">
            <div className="flex items-center gap-2">
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
              <Label htmlFor="sound-toggle" className="text-sm">
                Notification sound
              </Label>
            </div>
            <Switch
              id="sound-toggle"
              checked={settings.soundEnabled}
              onCheckedChange={toggleSound}
            />
          </div>

          {/* Category Selection */}
          <div className="pl-7 space-y-2">
            <Label className="text-sm text-muted-foreground">
              Notify for these categories:
            </Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(({ value, label, emoji }) => {
                const isSelected = settings.categories.includes(value);
                return (
                  <Badge
                    key={value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'hover:bg-muted'
                    )}
                    onClick={() => toggleCategory(value)}
                  >
                    <span className="mr-1">{emoji}</span>
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Test Notification */}
          <div className="pl-7">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (permission === 'granted') {
                  new Notification('🔔 Test Notification', {
                    body: 'Notifications are working correctly!',
                    icon: '/favicon-48x48.png',
                  });
                }
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Test Notification
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
