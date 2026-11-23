import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface UpiQrCodeProps {
  upiId: string;
  amount: number;
  customQrUrl?: string;
  tournamentTitle?: string;
}

export function UpiQrCode({ upiId, amount, customQrUrl, tournamentTitle }: UpiQrCodeProps) {
  const [generatedQr, setGeneratedQr] = useState<string>('');

  useEffect(() => {
    if (customQrUrl) return;
    const note = encodeURIComponent(tournamentTitle ? `Vynorix ${tournamentTitle}` : 'Vynorix Solo Entry');
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Vynorix Solo Tournament')}&am=${amount}&cu=INR&tn=${note}`;
    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 2,
      color: { dark: '#09090B', light: '#FFFFFF' },
    })
      .then(setGeneratedQr)
      .catch(() => setGeneratedQr(''));
  }, [upiId, amount, customQrUrl, tournamentTitle]);

  const src = customQrUrl || generatedQr;

  if (!src) {
    return (
      <div className="w-48 h-48 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-xs text-zinc-400">
        Generating UPI QR...
      </div>
    );
  }

  return (
    <div className="p-3 bg-white rounded-xl inline-block">
      <img
        src={src}
        alt={`UPI QR code for ${upiId}`}
        referrerPolicy="no-referrer"
        className="w-44 h-44 object-contain"
      />
    </div>
  );
}
