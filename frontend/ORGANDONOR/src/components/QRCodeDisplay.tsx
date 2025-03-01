import React from 'react';
import QRCode from 'qrcode.react';
import { Copy } from 'lucide-react';

interface QRCodeDisplayProps {
  roomUrl: string;
  roomId: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ roomUrl, roomId }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomUrl)
      .then(() => {
        alert('Room link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-2">Room: {roomId}</h2>
      <div className="mb-4">
        <QRCode value={roomUrl} size={200} />
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="truncate max-w-[200px]">{roomUrl}</span>
        <button 
          onClick={copyToClipboard}
          className="p-1 rounded hover:bg-gray-100"
          aria-label="Copy link"
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
};

export default QRCodeDisplay;