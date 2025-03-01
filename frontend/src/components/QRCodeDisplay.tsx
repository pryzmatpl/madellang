
import { QRCodeSVG } from 'qrcode.react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QRCodeDisplayProps {
  roomId: string;
  url: string;
}

const QRCodeDisplay = ({ roomId, url }: QRCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  
  const fullUrl = useMemo(() => {
    return url;
  }, [url]);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex flex-col items-center space-y-6 p-2 animate-fade-in">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-medium">Room QR Code</h2>
        <p className="text-sm text-muted-foreground">
          Scan to join this translation room
        </p>
      </div>
      
      <div className="qr-container bg-white p-4 rounded-lg">
        <QRCodeSVG
          value={fullUrl}
          size={200}
          level="H"
          includeMargin={true}
          className="transition-all duration-300"
        />
      </div>
      
      <div className="w-full max-w-sm space-y-2">
        <div className="relative">
          <input
            type="text"
            value={fullUrl}
            readOnly
            className="w-full pr-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          />
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "absolute right-0 top-0 h-full aspect-square text-muted-foreground",
              copied && "text-green-500"
            )}
            onClick={copyToClipboard}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          Room ID: <span className="font-mono">{roomId}</span>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
