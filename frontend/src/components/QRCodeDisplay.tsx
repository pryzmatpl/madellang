import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';

interface QRCodeDisplayProps {
  roomId: string | null;
  url: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ roomId, url }) => {
  const [copied, setCopied] = useState(false);
  
  // Make sure we have a valid string URL
  const fullUrl = url || '';
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (!roomId) return null;
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <h3 className="text-sm font-medium">Share this QR code to join the room</h3>
      
      <div className="qr-container bg-white p-4 rounded-lg">
        <QRCodeSVG
          value={fullUrl} 
          size={200}
          level="H"
          includeMargin={true}
        />
      </div>
      
      <div className="room-id text-sm text-center">
        <span className="font-medium">Room ID:</span> {roomId.substring(0, 8)}...
      </div>
      
      <div className="relative w-full max-w-md">
        <div className="flex items-center">
          <input
            type="text"
            value={fullUrl}
            readOnly
            className="w-full pr-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          />
          <button 
            onClick={copyToClipboard}
            className="absolute right-0 h-full px-3 text-gray-500 hover:text-gray-700"
            aria-label="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
