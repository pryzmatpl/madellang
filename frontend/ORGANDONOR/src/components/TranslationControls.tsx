import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface TranslationControlsProps {
  isTranslating: boolean;
  onToggleTranslation: () => void;
  isConnected: boolean;
}

const TranslationControls: React.FC<TranslationControlsProps> = ({
  isTranslating,
  onToggleTranslation,
  isConnected
}) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={onToggleTranslation}
        disabled={!isConnected}
        className={`
          flex items-center justify-center gap-2 
          px-6 py-3 rounded-full font-medium text-white
          transition-all duration-200 
          ${isTranslating 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-indigo-600 hover:bg-indigo-700'
          }
          ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
          w-48
        `}
      >
        {isTranslating ? (
          <>
            <MicOff size={20} />
            <span>Stop</span>
          </>
        ) : (
          <>
            <Mic size={20} />
            <span>Start</span>
          </>
        )}
      </button>
      
      {!isConnected && (
        <p className="text-sm text-red-500">
          Not connected to server
        </p>
      )}
    </div>
  );
};

export default TranslationControls;