import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-md transition-colors ${
          theme === "light"
            ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
        title="Light Mode"
      >
        <Sun size={20} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-md transition-colors ${
          theme === "dark"
            ? "bg-white dark:bg-gray-700 shadow-sm text-blue-400"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
        title="Dark Mode"
      >
        <Moon size={20} />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-md transition-colors ${
          theme === "system"
            ? "bg-white dark:bg-gray-700 shadow-sm text-blue-500"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
        title="System Preference"
      >
        <Monitor size={20} />
      </button>
    </div>
  );
};
