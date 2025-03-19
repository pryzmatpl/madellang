import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import translationService from '../services/TranslationService';
import TranslationRoom from '../components/TranslationRoom';

// Mock the translation service
jest.mock('../services/TranslationService', () => ({
  __esModule: true,
  default: {
    getSystemInfo: jest.fn().mockResolvedValue({
      pytorch_version: '1.13.0',
      cuda_available: true,
      whisper_version: '1.0.0',
      device_name: 'AMD Radeon',
      gpu_type: 'AMD (ROCm/HIP)',
      whisper_model: 'small'
    }),
    getAvailableLanguages: jest.fn().mockResolvedValue([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' }
    ]),
    joinRoom: jest.fn().mockResolvedValue(undefined),
    leaveRoom: jest.fn().mockResolvedValue(undefined),
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    changeLanguage: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    isRecording: jest.fn().mockReturnValue(false),
    getCurrentRoomId: jest.fn().mockReturnValue('test-room'),
    getUserId: jest.fn().mockReturnValue('test-user-123'),
    getCurrentLanguage: jest.fn().mockReturnValue('en'),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }
}));

describe('TranslationRoom Component Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders room and connects to backend', async () => {
    render(<TranslationRoom roomId="test-room" />);
    
    // Check that room information is displayed
    expect(screen.getByText(/Room: test-room/i)).toBeInTheDocument();
    
    // Wait for system info to load
    await waitFor(() => {
      expect(screen.getByText(/System Information/i)).toBeInTheDocument();
    });
    
    // Check if service was called with correct parameters
    expect(translationService.getSystemInfo).toHaveBeenCalled();
    expect(translationService.getAvailableLanguages).toHaveBeenCalled();
  });
  
  test('toggles recording when button is clicked', async () => {
    render(<TranslationRoom roomId="test-room" />);
    
    // Wait for connection to be established
    await waitFor(() => {
      expect(translationService.joinRoom).toHaveBeenCalled();
    });
    
    // Find and click the record button
    const recordButton = screen.getByText(/Start Recording/i);
    fireEvent.click(recordButton);
    
    // Verify recording was started
    expect(translationService.startRecording).toHaveBeenCalled();
    
    // Mock recording state change
    (translationService.isRecording as jest.Mock).mockReturnValue(true);
    
    // Simulate event that would trigger UI update
    translationService.emit('statusChange', 'Recording started');
    
    // Wait for button text to change
    await waitFor(() => {
      expect(screen.getByText(/Stop Recording/i)).toBeInTheDocument();
    });
    
    // Click again to stop
    fireEvent.click(screen.getByText(/Stop Recording/i));
    
    // Verify recording was stopped
    expect(translationService.stopRecording).toHaveBeenCalled();
  });
  
  test('changes language when selector is changed', async () => {
    render(<TranslationRoom roomId="test-room" />);
    
    // Wait for languages to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Translate to:/i)).toBeInTheDocument();
    });
    
    // Change language
    fireEvent.change(screen.getByLabelText(/Translate to:/i), { 
      target: { value: 'es' } 
    });
    
    // Verify language was changed
    expect(translationService.changeLanguage).toHaveBeenCalledWith('es');
  });
}); 