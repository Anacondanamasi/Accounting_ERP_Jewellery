import { useEffect, useRef, useState } from "react";
import { Camera, X, Flashlight, AlertCircle, Keyboard, CheckCircle2 } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { playScanSuccessBeep } from "@/utils/scanFeedback";

interface ScanCameraModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
}

export const ScanCameraModal = ({ open, onClose, onScan }: ScanCameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [justScanned, setJustScanned] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const cooldownRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;

    setCameraError(null);
    setJustScanned(false);
    cooldownRef.current = false;

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    let isMounted = true;

    // Start continuous automatic decoding from the environment/back camera
    codeReader
      .decodeFromVideoDevice(
        null, // null = default camera (prefers environment/rear camera)
        videoRef.current,
        (result, err) => {
          if (!isMounted) return;

          if (result && !cooldownRef.current) {
            const text = result.getText();
            if (text) {
              cooldownRef.current = true;
              setLastScanned(text);
              setJustScanned(true);

              // 1. Play loud success confirmation sound immediately
              playScanSuccessBeep();

              // 2. Deliver code to parent handler
              onScan(text);

              // 3. Visual green flash for 800ms
              setTimeout(() => {
                if (isMounted) setJustScanned(false);
              }, 800);

              // 4. Cooldown 1.2s to prevent rapid multi-triggers of the exact same tag
              setTimeout(() => {
                cooldownRef.current = false;
              }, 1200);
            }
          }

          // If err: do NOT log NotFoundException/ChecksumException to console (normal frame without barcode)
        }
      )
      .then(() => {
        // Check torch capabilities on the active video track
        if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
          const stream = videoRef.current.srcObject;
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          const caps = (track?.getCapabilities?.() as any) || {};
          if (caps.torch) {
            setHasTorch(true);
          }
        }
      })
      .catch((e: any) => {
        if (!isMounted) return;
        setCameraError(e.message || "Unable to start camera. Please ensure camera permissions are granted.");
      });

    return () => {
      isMounted = false;
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, onScan]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchOn(next);
      } catch {}
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    playScanSuccessBeep();
    onScan(clean);
    setManualCode("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-charcoal px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-gold" />
            <span className="text-sm font-bold">Automatic Barcode & QR Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder View */}
        <div className="relative aspect-square w-full overflow-hidden bg-black flex items-center justify-center select-none">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300">
              <AlertCircle className="mx-auto h-10 w-10 text-gold mb-2" />
              <p className="text-xs">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`relative h-56 w-56 rounded-2xl border-2 transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] ${
                    justScanned
                      ? "border-emerald bg-emerald/20 shadow-[0_0_25px_rgba(16,185,129,0.9)] scale-105"
                      : "border-gold/80"
                  }`}
                >
                  {/* Laser Scan line */}
                  <div
                    className={`absolute left-2 right-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent ${
                      justScanned ? "hidden" : "animate-pulse"
                    }`}
                  />
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-gold rounded-tl" />
                  <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-gold rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-gold rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-gold rounded-br" />

                  {/* Scanned Checkmark Overlay */}
                  {justScanned && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald animate-in zoom-in-50 duration-200">
                      <CheckCircle2 className="h-16 w-16" />
                      <span className="mt-1 text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                        SCANNED!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Top controls (Torch) */}
              {hasTorch && (
                <div className="absolute top-3 right-3 pointer-events-auto">
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`rounded-full p-2 backdrop-blur-md transition-all ${
                      torchOn ? "bg-gold text-white" : "bg-black/60 text-white"
                    }`}
                  >
                    <Flashlight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Real-time status badge */}
              <div className="absolute bottom-3 left-4 right-4 text-center pointer-events-none">
                {lastScanned ? (
                  <div className="inline-block rounded-lg bg-emerald/90 px-3 py-1.5 font-mono text-xs font-bold text-white shadow backdrop-blur-sm">
                    Last Scanned: {lastScanned}
                  </div>
                ) : (
                  <div className="inline-block rounded-lg bg-black/60 px-3 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-sm">
                    Hold item barcode or QR code inside the box to scan
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer with Manual Input Option */}
        <div className="border-t border-border bg-surface p-4 space-y-2">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or type/paste code & press Enter..."
                className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-xs font-mono uppercase focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="rounded-lg bg-charcoal px-3.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
            >
              Add
            </button>
          </form>

          <p className="text-center text-[11px] text-muted">
            Camera automatically detects codes. Handheld barcode scanners work anywhere on screen.
          </p>
        </div>
      </div>
    </div>
  );
};
