import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemeToggle } from "./components/ThemeToggle";
import { Layout, Home, Settings, Info, Command } from "lucide-react";
import "./App.css";

interface SystemInfo {
  os: string;
  arch: string;
}

function App() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-md">
        <div 
          data-tauri-drag-region 
          className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 cursor-default select-none"
        >
          <Command className="mr-2 text-blue-500" size={20} />
          <span className="font-bold text-sm tracking-tight">X4 LAUNCHER</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<Home size={18} />} label="Home" active />
          <NavItem icon={<Layout size={18} />} label="Parser" />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Custom Titlebar / Topbar */}
        <header 
          data-tauri-drag-region 
          className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white/50 dark:bg-gray-950/50 backdrop-blur-md"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Status: <span className="text-green-500">Ready</span>
          </div>
          <div className="flex items-center gap-4">
            <Info size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <section>
              <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome</h1>
              <p className="text-gray-500 dark:text-gray-400">
                This is the starting skeleton for the X4 Savegame Parser & Launcher.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Monitor className="mr-2 text-blue-500" size={20} />
                  System Information
                </h3>
                {error ? (
                  <p className="text-red-500 text-sm">{error}</p>
                ) : systemInfo ? (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">OS</dt>
                      <dd className="font-mono">{systemInfo.os}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Architecture</dt>
                      <dd className="font-mono">{systemInfo.arch}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-gray-400 animate-pulse text-sm">Loading system info...</p>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Check the implementation plan in the Docs folder to see what's next.
                </p>
                <button className="px-4 py-2 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">
                  View Docs
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) => (
  <div className={`
    flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer
    ${active 
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"}
  `}>
    <span className="mr-3">{icon}</span>
    {label}
  </div>
);

const Monitor = ({ className, size }: { className?: string; size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

export default App;
