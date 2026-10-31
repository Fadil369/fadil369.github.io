import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { extractSpid } from '../utils/identity';

// Scans a QR code with the device camera and hands back the first SPID it finds.
// Uses the browser's BarcodeDetector where it exists (Chrome/Android/Edge); elsewhere
// decodes frames with jsQR, loaded only when scanning starts. Frames never leave the device.

interface Detector { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
declare global { interface Window { BarcodeDetector?: new (o: { formats: string[] }) => Detector } }

export default function QrScanner({ onSpid, onClose }: { onSpid: (spid: string) => void; onClose: () => void }) {
  const { ar } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState('');
  const [seen, setSeen] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setMsg(ar ? 'هذا المتصفح لا يتيح الكاميرا.' : 'This browser does not offer camera access.'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        setMsg(ar ? 'لم يُسمح بالوصول إلى الكاميرا. أدخل المعرّف يدويًا.' : 'Camera access was not allowed. Enter the SPID by hand.');
        return;
      }
      if (stopped || !video.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      const native = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
      const jsQR = native ? null : (await import('jsqr')).default;

      const tick = async () => {
        if (stopped || !video.current) return;
        const v = video.current;
        if (v.readyState >= 2 && v.videoWidth) {
          let text = '';
          if (native) {
            const codes = await native.detect(v).catch(() => []);
            text = codes[0]?.rawValue || '';
          } else if (jsQR && ctx) {
            const w = Math.min(640, v.videoWidth);
            const h = Math.round((v.videoHeight / v.videoWidth) * w);
            canvas.width = w; canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' })?.data || '';
          }
          if (text) {
            const spid = extractSpid(text);
            if (spid) { onSpid(spid); return; }
            setSeen(text.slice(0, 80));
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [ar, onSpid]);

  return (
    <div className="bpr-scanner" role="dialog" aria-label={ar ? 'مسح رمز QR' : 'Scan a QR code'}>
      <div className="bpr-scanner-head">
        <Camera size={17} /><strong>{ar ? 'وجّه الكاميرا نحو رمز QR على البطاقة' : 'Point the camera at the card’s QR code'}</strong>
        <button onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'}><X size={17} /></button>
      </div>
      <div className="bpr-scanner-frame">
        <video ref={video} muted playsInline aria-hidden="true" />
        <span className="bpr-scanner-reticle" aria-hidden="true" />
      </div>
      <p className="bpr-note" role="status">{msg || (seen
        ? (ar ? `قُرئ رمز لا يحتوي معرّف BPR: ${seen}` : `Read a code with no BPR SPID in it: ${seen}`)
        : (ar ? 'تبقى الصورة على جهازك؛ لا يُرسل أي إطار.' : 'The image stays on your device; no frame is sent anywhere.'))}</p>
    </div>
  );
}
