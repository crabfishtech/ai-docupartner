import React from 'react';

type DebugMessage = {
  id: string;
  type: 'request' | 'response';
  content: any;
  timestamp: number;
};

type DebugDrawerProps = {
  messages: DebugMessage[];
  onClose: () => void;
  isLoading?: boolean;
};

const DebugDrawer: React.FC<DebugDrawerProps> = ({ messages, onClose, isLoading = false }) => {
  return (
    <div className="h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 overflow-auto">
      <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-3 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Debug Console</h2>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-zinc-400 my-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500 mb-2"></div>
            <p>Loading debug messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-zinc-400 my-8">
            No debug messages yet. Send a message to see the LLM request and response.
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`p-3 rounded-lg border ${
                message.type === 'request' 
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">
                  {message.type === 'request' ? '🔼 Request' : '🔽 Response'}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-xs overflow-auto p-2 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 max-h-60">
                {JSON.stringify(message.content, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DebugDrawer;
