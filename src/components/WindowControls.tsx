import React from 'react';
import { Window } from '@tauri-apps/api/window';
import { X, Minus, Square } from 'lucide-react';

const appWindow = new Window('main');

export const WindowControls: React.FC = () => {
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = async () => {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };
  const handleClose = () => appWindow.close();

  return (
    <div className="flex items-center no-drag">
      <button
        onClick={handleMinimize}
        className="p-3 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={handleMaximize}
        className="p-3 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <Square size={12} />
      </button>
      <button
        onClick={handleClose}
        className="p-3 hover:bg-red-500 hover:text-white transition-colors text-gray-500"
      >
        <X size={14} />
      </button>
    </div>
  );
};
