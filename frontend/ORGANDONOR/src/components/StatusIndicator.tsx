import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected: boolean;
  isTranslating: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isConnected, isTranslating }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi size={16} className="text-green-500" />
        ) : (
          <WifiOff size={16} className="text-red-500" />
        )}
        <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {isConnected && (
        <div className="flex items-center gap-1 ml-4">
          <div className={`w-2 h-2 rounded-full ${isTranslating ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm text-gray-600">
            {isTranslating ? 'Translating' : 'Idle'}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatusIndicator;