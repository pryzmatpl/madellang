import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import RoomCreator from './components/RoomCreator';
import TranslationRoom from './components/TranslationRoom';
import './App.css';

const App: React.FC = () => {
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>Voice Translation App</h1>
        </header>

        <main className="app-content">
          <Routes>
            <Route path="/" element={
              activeRoom ? 
                <Navigate to={`/room/${activeRoom}`} replace /> : 
                <RoomCreator onRoomSelected={setActiveRoom} />
            } />
            
            <Route path="/room/:roomId" element={
              <TranslationRoom 
                roomId={activeRoom || ''} 
                onLeaveRoom={() => setActiveRoom(null)}
              />
            } />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>Powered by Whisper and FastAPI</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
