import QRCode from 'qrcode.react';

// Improve QR code generation with proper URL
const QRCodeDisplay = ({ url }: { url: string }) => {
  return (
    <div className="qr-code-container p-4 bg-white rounded shadow-md">
      <h3 className="text-lg font-semibold mb-2">Scan to join this room</h3>
      <QRCode value={url} size={200} />
      <p className="mt-2 text-sm text-gray-500 break-all">{url}</p>
    </div>
  );
}; 