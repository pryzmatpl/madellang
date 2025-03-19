import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useParams } from 'react-router-dom';
import RoomCreator from './components/RoomCreator';
import TranslationRoom from './components/TranslationRoom';
import './App.css';

const RoomWrapper: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  return (
    <TranslationRoom 
      roomId={roomId || ''} 
      onLeaveRoom={() => {
        // Navigate will be handled by Link in the component
      }}
    />
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>Voice Translation App</h1>
        </header>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<RoomCreator onRoomSelected={() => {}} />} />
            <Route path="/room/:roomId" element={<RoomWrapper />} />
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
