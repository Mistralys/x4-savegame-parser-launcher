import React, { useEffect, useRef } from 'react';

interface LogViewerProps {
  logs: string[];
  className?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div 
      ref={scrollRef}
      className={`bg-gray-950 text-gray-300 font-mono text-xs p-4 rounded-xl overflow-y-auto h-96 border border-gray-800 shadow-inner ${className}`}
    >
      {logs.length === 0 ? (
        <div className="text-gray-600 italic">Waiting for output...</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap mb-1 leading-relaxed border-l border-gray-800 pl-3">
            {log}
          </div>
        ))
      )}
    </div>
  );
};
