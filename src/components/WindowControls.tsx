import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { X, Minus, Square, Copy } from 'lucide-react';

export const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false);

  React.useEffect(() => {
    const win = getCurrentWindow();
    const updateStatus = async () => {
      setIsMaximized(await win.isMaximized());
    };
    
    updateStatus();
    const unlisten = win.onResized(updateStatus);
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    getCurrentWindow().minimize();
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    getCurrentWindow().close();
  };

  return (
    <div className="flex items-center h-full">
      <button
        onClick={handleMinimize}
        className="h-12 w-12 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        title="Minimize"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={handleMaximize}
        className="h-12 w-12 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? <Copy size={14} className="rotate-180" /> : <Square size={14} />}
      </button>
      <button
        onClick={handleClose}
        className="h-12 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-gray-500"
        title="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
};
