import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemeToggle } from "./components/ThemeToggle";
import { Layout, Home, Settings, Info, Command, AlertCircle, Activity } from "lucide-react";
import { useI18n } from "./context/I18nContext";
import { useConfig } from "./context/ConfigContext";
import { useError } from "./context/ErrorContext";
import { useNotification } from "./context/NotificationContext";
import { useProcess } from "./context/ProcessContext";
import { ErrorBanner } from "./components/ErrorBanner";
import { SettingsView } from "./components/SettingsView";
import { ToolView } from "./components/ToolView";
import { SaveDataViewer } from "./components/SaveDataViewer";
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

type Tab = "home" | "monitor" | "viewer" | "settings";

function App() {
  const { t } = useI18n();
  const { config, isLoading: configLoading } = useConfig();
  const { showError } = useError();
  const { showNotification } = useNotification();
  const { tools } = useProcess();
  
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch((err) => {
        showError(t('errors.title'), "Failed to get system info", String(err));
      });
  }, [showError, t]);

  // Global listener for monitor events
  const lastEventRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentEvent = tools.parser.currentEvent;
    if (currentEvent === 'SAVE_PARSING_COMPLETE' && lastEventRef.current !== 'SAVE_PARSING_COMPLETE') {
      const latestEvent = tools.parser.events[0];
      const duration = latestEvent?.payload?.extractionDurationFormatted;
      const saveName = latestEvent?.payload?.saveName;
      
      let message = 'A savegame has been successfully extracted and is ready for viewing.';
      if (saveName && duration) {
        message = `"${saveName}" has been successfully extracted in ${duration}.`;
      } else if (saveName) {
        message = `"${saveName}" has been successfully extracted.`;
      }

      showNotification('success', t('tools.events.SAVE_PARSING_COMPLETE') || 'Extraction Complete', message);
    }
    lastEventRef.current = currentEvent;
  }, [tools.parser.currentEvent, tools.parser.events, showNotification, t]);

  if (configLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="animate-pulse text-gray-500 font-medium">{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl">
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <ErrorBanner />
        
        {/* Header / Title Bar */}
        <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 cursor-default relative">
          {/* Main Drag Layer */}
          <div
            data-tauri-drag-region
            className="absolute inset-0 z-0"
            style={{ WebkitAppRegion: 'drag' } as any}
          />
          
          {/* Header Content Layer */}
          <div className="absolute inset-0 flex items-center justify-between z-10 px-6">
            {/* Left: App Title */}
            <div className="flex items-center gap-3 shrink-0 pointer-events-none">
              <div className="p-1.5 rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                 <Command size={20} />
              </div>
              <span className="font-bold text-sm tracking-tight hidden sm:block">{t('app.title')}</span>
            </div>

            {/* Center: Main Navigation */}
            <nav className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 pointer-events-auto mx-4">
              <NavTab
                icon={<Home size={16} />}
                label={t('nav.home')}
                active={activeTab === "home"}
                onClick={() => setActiveTab("home")}
              />
              <NavTab
                icon={<Layout size={16} />}
                label={t('nav.monitor')}
                active={activeTab === "monitor"}
                onClick={() => setActiveTab("monitor")}
              />
              <NavTab
                icon={<Activity size={16} />}
                label={t('nav.viewer')}
                active={activeTab === "viewer"}
                onClick={() => setActiveTab("viewer")}
              />
              <NavTab
                icon={<Settings size={16} />}
                label={t('nav.settings')}
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              />
            </nav>
            
            {/* Right: Actions & Window Controls */}
            <div className="flex items-center h-full pointer-events-auto gap-2 shrink-0">
              <div className="w-px h-6 bg-gray-200 dark:border-gray-800 mx-2" />

              <div
                onClick={async (e) => {
                  e.stopPropagation();
                  const { message } = await import('@tauri-apps/plugin-dialog');
                  await message(
                    `X4 Savegame Monitor & Launcher v0.1.0\n\nOS: ${systemInfo?.os}\nArch: ${systemInfo?.arch}\n\nBuilt with Tauri & React`,
                    { title: 'About', kind: 'info' }
                  );
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer rounded-lg"
                title="About"
              >
                <Info size={18} />
              </div>
              <WindowControls />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pb-0 relative z-0">
          <div className={cn("mx-auto space-y-8 pb-8", activeTab === "viewer" ? "max-w-6xl" : "max-w-3xl")}>
            {activeTab === "home" && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                <SettingsView />
              </section>
            )}

            {activeTab === "monitor" && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ToolView tool="parser" />
              </section>
            )}

            {activeTab === "viewer" && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SaveDataViewer />
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const NavTab = ({
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
  <button
    onClick={onClick}
    className={cn(
      "flex items-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
      active
        ? "bg-white dark:bg-gray-800 text-blue-500 shadow-sm shadow-black/5"
        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
    )}
  >
    <span className="mr-2 opacity-70">{icon}</span>
    {label}
  </button>
);

export default App;
