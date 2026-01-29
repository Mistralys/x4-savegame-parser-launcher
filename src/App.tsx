import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemeToggle } from "./components/ThemeToggle";
import { Layout, Home, Settings, Info, Command, AlertCircle, Activity } from "lucide-react";
import { useI18n } from "./context/I18nContext";
import { useConfig } from "./context/ConfigContext";
import { useError } from "./context/ErrorContext";
import { useValidation } from "./context/ValidationContext";
import { ErrorBanner } from "./components/ErrorBanner";
import { SettingsView } from "./components/SettingsView";
import { ToolView } from "./components/ToolView";
import { WindowControls } from "./components/WindowControls";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import "./App.css";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SystemInfo {
  os: string;
  arch: string;
}

type Tab = "home" | "parser" | "viewer" | "settings";

function App() {
  const { t } = useI18n();
  const { config, isLoading: configLoading } = useConfig();
  const { showError } = useError();
  
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch((err) => {
        setError(String(err));
        showError(t('errors.title'), "Failed to get system info", String(err));
      });
  }, [showError, t]);

  if (configLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="animate-pulse text-gray-500 font-medium">{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900 shrink-0 relative">
        {/* Sidebar Drag Layer */}
        <div 
          data-tauri-drag-region 
          className="absolute top-0 left-0 right-0 h-12 z-0" 
          style={{ WebkitAppRegion: 'drag' } as any}
        />
        
        <div className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 cursor-default select-none shrink-0 relative z-10 pointer-events-none">
          <div className="flex items-center">
            <Command className="mr-2 text-blue-500" size={20} />
            <span className="font-bold text-sm tracking-tight">{t('app.title')}</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 relative z-10">
          <NavItem 
            icon={<Home size={18} />} 
            label={t('nav.home')} 
            active={activeTab === "home"} 
            onClick={() => setActiveTab("home")} 
          />
          <NavItem
            icon={<Layout size={18} />}
            label={t('nav.parser')}
            active={activeTab === "parser"}
            onClick={() => setActiveTab("parser")}
          />
          <NavItem
            icon={<Activity size={18} />}
            label={t('nav.viewer')}
            active={activeTab === "viewer"}
            onClick={() => setActiveTab("viewer")}
          />
          <NavItem 
            icon={<Settings size={18} />} 
            label={t('nav.settings')} 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")} 
          />
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 relative z-10">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <ErrorBanner />
        
        {/* Header / Title Bar */}
        <header className="h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 cursor-default relative">
          {/* Main Drag Layer */}
          <div 
            data-tauri-drag-region 
            className="absolute inset-0 z-0" 
            style={{ WebkitAppRegion: 'drag' } as any}
          />
          
          {/* Header Content Layer */}
          <div className="absolute inset-0 flex items-center justify-between z-10 pointer-events-none px-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium select-none">
              {t('app.status')}: <span className="text-green-500">{t('app.ready')}</span>
            </div>
            
            <div className="flex items-center h-full pointer-events-auto">
              <div
                onClick={async (e) => {
                  e.stopPropagation();
                  const { message } = await import('@tauri-apps/plugin-dialog');
                  await message(
                    `X4 Savegame Monitor & Launcher v0.1.0\n\nOS: ${systemInfo?.os}\nArch: ${systemInfo?.arch}\n\nBuilt with Tauri & React`,
                    { title: 'About', kind: 'info' }
                  );
                }}
                className="p-3 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer h-full flex items-center"
                title="About"
              >
                <Info size={18} />
              </div>
              <WindowControls />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative z-0">
          <div className="max-w-3xl mx-auto space-y-8">
            {activeTab === "home" && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-3xl font-extrabold tracking-tight mb-2">{t('app.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('app.ready')} - {config.language.toUpperCase()}
                </p>
                
                <div className="mt-8 p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <AlertCircle className="mr-2 text-blue-500" size={20} />
                    {t('app.status')}
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      System: <span className="font-mono">{systemInfo?.os} ({systemInfo?.arch})</span>
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "settings" && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-3xl font-extrabold tracking-tight mb-6">{t('settings.title')}</h1>
                <SettingsView />
              </section>
            )}

            {activeTab === "parser" && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-3xl font-extrabold tracking-tight mb-6">{t('nav.parser')}</h1>
                <ToolView tool="parser" />
              </section>
            )}

            {activeTab === "viewer" && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h1 className="text-3xl font-extrabold tracking-tight mb-6">{t('nav.viewer')}</h1>
                <ToolView tool="viewer" />
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ 
  icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick: () => void;
}) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
      active 
        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
    )}
  >
    <span className="mr-3">{icon}</span>
    {label}
  </div>
);

export default App;
