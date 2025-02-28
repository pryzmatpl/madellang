import React from 'react';
import { useTranslation } from './hooks/useTranslation';
import QRCodeDisplay from './components/QRCodeDisplay';
import LanguageSelector from './components/LanguageSelector';
import TranslationControls from './components/TranslationControls';
import StatusIndicator from './components/StatusIndicator';
import { supportedLanguages } from './data/languages';
import { Headphones } from 'lucide-react';

function App() {
  const {
    isConnected,
    isTranslating,
    selectedLanguage,
    roomData,
    error,
    toggleTranslation,
    setLanguage
  } = useTranslation();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-gray-700">Initializing translation room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <Headphones className="h-8 w-8 text-indigo-600 mr-2" />
            <h1 className="text-xl font-semibold text-gray-900">Voice Translator</h1>
          </div>
          <StatusIndicator isConnected={isConnected} isTranslating={isTranslating} />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-lg w-full">
          <div className="flex flex-col items-center gap-6">
            <QRCodeDisplay roomUrl={roomData.url} roomId={roomData.id} />
            
            <div className="w-full">
              <LanguageSelector
                selectedLanguage={selectedLanguage}
                onLanguageChange={setLanguage}
                languages={supportedLanguages}
                disabled={isTranslating}
              />
            </div>
            
            <TranslationControls
              isTranslating={isTranslating}
              onToggleTranslation={toggleTranslation}
              isConnected={isConnected}
            />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Real-time Voice Translation App • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;