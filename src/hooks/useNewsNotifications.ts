import { useCallback, useEffect, useState } from 'react';
import { NewsItem, NewsCategory } from './useNewsMonitor';

// High-priority categories that trigger notifications
const HIGH_PRIORITY_CATEGORIES: NewsCategory[] = [
  'listing_approved',
  'regulator_violation',
  'merger_acquisition',
  'expansion_contract',
];

const NOTIFICATION_STORAGE_KEY = 'orkestra_notification_settings';

interface NotificationSettings {
  enabled: boolean;
  categories: NewsCategory[];
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  categories: HIGH_PRIORITY_CATEGORIES,
  soundEnabled: true,
};

export function useNewsNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load notification settings:', e);
    }
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const saveSettings = useCallback((newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(newSettings));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        saveSettings({ ...settings, enabled: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [settings, saveSettings]);

  const toggleNotifications = useCallback(async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }
    saveSettings({ ...settings, enabled });
    return true;
  }, [permission, requestPermission, settings, saveSettings]);

  const toggleCategory = useCallback((category: NewsCategory) => {
    const newCategories = settings.categories.includes(category)
      ? settings.categories.filter(c => c !== category)
      : [...settings.categories, category];
    saveSettings({ ...settings, categories: newCategories });
  }, [settings, saveSettings]);

  const toggleSound = useCallback((enabled: boolean) => {
    saveSettings({ ...settings, soundEnabled: enabled });
  }, [settings, saveSettings]);

  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.warn('Failed to play notification sound:', e);
    }
  }, [settings.soundEnabled]);

  const showNotification = useCallback((newsItem: NewsItem) => {
    if (!settings.enabled || permission !== 'granted') return;
    if (!settings.categories.includes(newsItem.category)) return;

    try {
      const categoryLabels: Record<NewsCategory, string> = {
        tasi: '📈 TASI',
        nomu: '📊 NOMU',
        listing_approved: '🚀 New Listing',
        stock_market: '📈 Market',
        management_change: '👤 Management',
        regulator_announcement: '📋 Regulator',
        regulator_regulation: '📜 Regulation',
        regulator_violation: '⚠️ Violation',
        shareholder_change: '👥 Shareholder',
        macroeconomics: '🌍 Macro',
        microeconomics: '📊 Micro',
        country_outlook: '🔭 Outlook',
        joint_venture: '🤝 JV',
        merger_acquisition: '🤝 M&A',
        expansion_contract: '📄 Contract',
        general: '📰 News',
      };

      const notification = new Notification(categoryLabels[newsItem.category], {
        body: newsItem.title,
        icon: '/favicon-48x48.png',
        badge: '/favicon-32x32.png',
        tag: newsItem.id,
        requireInteraction: false,
        silent: !settings.soundEnabled,
      });

      notification.onclick = () => {
        window.focus();
        window.open(newsItem.url, '_blank');
        notification.close();
      };

      if (settings.soundEnabled) {
        playNotificationSound();
      }
      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [settings, permission, playNotificationSound]);

  const notifyNewItems = useCallback((newsItems: NewsItem[]) => {
    const highPriorityItems = newsItems.filter(
      item => item.isNew && settings.categories.includes(item.category)
    );
    if (highPriorityItems.length === 0) return;

    if (highPriorityItems.length > 3) {
      if (!settings.enabled || permission !== 'granted') return;
      try {
        const notification = new Notification('🔔 Multiple News Items', {
          body: `${highPriorityItems.length} new items`,
          icon: '/favicon-48x48.png',
          tag: 'batch-notification',
        });
        notification.onclick = () => { window.focus(); notification.close(); };
        if (settings.soundEnabled) playNotificationSound();
        setTimeout(() => notification.close(), 10000);
      } catch (error) {
        console.error('Failed to show batch notification:', error);
      }
    } else {
      highPriorityItems.forEach((item, index) => {
        setTimeout(() => showNotification(item), index * 500);
      });
    }
  }, [settings, permission, showNotification, playNotificationSound]);

  return {
    permission, settings, isSupported: 'Notification' in window,
    requestPermission, toggleNotifications, toggleCategory, toggleSound, showNotification, notifyNewItems,
  };
}
