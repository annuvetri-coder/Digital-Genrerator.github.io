import React, { createContext, useContext, useEffect, useState } from 'react';
import { CompanySettings } from '../types';
import { api, DEFAULT_SETTINGS } from '../services/api';

interface SettingsContextType {
  settings: CompanySettings;
  isLoading: boolean;
  updateSettings: (newSettings: CompanySettings) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (e) {
      console.error('Error loading settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSettings = async (newSettings: CompanySettings) => {
    setSettings(newSettings);
    await api.saveSettings(newSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
