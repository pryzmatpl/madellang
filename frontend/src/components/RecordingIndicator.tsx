import React, { useState, useEffect } from 'react';
import './RecordingIndicator.css';

interface RecordingIndicatorProps {
  isRecording: boolean;
}

const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({ isRecording }) => {
  const [pulseState, setPulseState] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording) {
      interval = setInterval(() => {
        setPulseState(prev => !prev);
      }, 500);
    } else {
      setPulseState(false);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  return (
    <div className="recording-indicator">
      <div className={`record-dot ${isRecording ? 'recording' : ''} ${pulseState ? 'pulse' : ''}`} />
      <span>{isRecording ? 'Recording' : 'Not Recording'}</span>
    </div>
  );
};

export default RecordingIndicator; 