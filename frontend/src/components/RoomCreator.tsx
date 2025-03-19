import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './RoomCreator.css';

interface RoomCreatorProps {
  onRoomSelected: (roomId: string) => void;
}

const RoomCreator: React.FC<RoomCreatorProps> = ({ onRoomSelected }) => {
  const [roomId, setRoomId] = useState('');
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  
  // Load recent rooms from localStorage
  useEffect(() => {
    const savedRooms = localStorage.getItem('recentRooms');
    if (savedRooms) {
      try {
        setRecentRooms(JSON.parse(savedRooms));
      } catch (e) {
        console.error('Failed to parse recent rooms', e);
      }
    }
  }, []);
  
  // Save recent rooms to localStorage
  const saveRoomToRecent = (newRoomId: string) => {
    const updatedRooms = [
      newRoomId, 
      ...recentRooms.filter(id => id !== newRoomId)
    ].slice(0, 5); // Keep only the 5 most recent
    
    setRecentRooms(updatedRooms);
    localStorage.setItem('recentRooms', JSON.stringify(updatedRooms));
  };
  
  const handleJoinRoom = () => {
    if (roomId.trim()) {
      saveRoomToRecent(roomId);
      onRoomSelected(roomId);
    }
  };
  
  const handleCreateRoom = () => {
    // Generate a readable room name
    const adjectives = [
      'happy', 'clever', 'brave', 'bright', 'calm', 
      'eager', 'fair', 'kind', 'proud', 'wise'
    ];
    const nouns = [
      'apple', 'bird', 'cloud', 'diamond', 'eagle', 
      'forest', 'garden', 'harbor', 'island', 'journey'
    ];
    const numbers = Math.floor(Math.random() * 1000);
    
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const newRoomId = `${randomAdj}-${randomNoun}-${numbers}`;
    
    saveRoomToRecent(newRoomId);
    onRoomSelected(newRoomId);
  };
  
  const handleRecentRoomClick = (selectedRoom: string) => {
    saveRoomToRecent(selectedRoom); // Move to top of recent list
    onRoomSelected(selectedRoom);
  };

  return (
    <div className="room-creator">
      <h2>Join or Create a Translation Room</h2>
      
      <div className="join-room">
        <div className="input-group">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID"
          />
          <button 
            onClick={handleJoinRoom}
            disabled={!roomId.trim()}
          >
            Join Room
          </button>
        </div>
      </div>
      
      <div className="or-divider">
        <span>OR</span>
      </div>
      
      <div className="create-room">
        <button 
          className="create-button"
          onClick={handleCreateRoom}
        >
          Create New Room
        </button>
      </div>
      
      {recentRooms.length > 0 && (
        <div className="recent-rooms">
          <h3>Recent Rooms</h3>
          <ul>
            {recentRooms.map((room) => (
              <li key={room}>
                <button 
                  className="recent-room-button"
                  onClick={() => handleRecentRoomClick(room)}
                >
                  {room}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RoomCreator; 