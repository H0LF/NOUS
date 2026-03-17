"use client";

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface BarcodeScannerProps {
  onResult: (data: any) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

export const BarcodeScanner = ({ onResult, onClose }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Check support
    if (!("BarcodeDetector" in window)) {
      setError("Barcode detection is not supported in this browser. Please use Chrome on Android or macOS/Windows.");
      return;
    }

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error(err);
        setError("Failed to access camera. Please allow camera permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!stream || !videoRef.current || error) return;
    
    // eslint-disable-next-line no-undef
    const barcodeDetector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    let interval: NodeJS.Timeout;

    const detect = async () => {
      if (!videoRef.current) return;
      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          // Stop scanning
          clearInterval(interval);
          if (stream) stream.getTracks().forEach(track => track.stop());
          
          // Fetch product data
          try {
             // Show loading toast?
             const res = await fetch(`/api/food/barcode?barcode=${code}`);
             if (!res.ok) throw new Error("Product not found");
             const data = await res.json();
             onResult({ ...data, source: "barcode" });
          } catch (e: unknown) {
             toast.error(e instanceof Error ? e.message : "Failed to lookup product");
             onClose();
          }
        }
      } catch (e) {
        console.error("Detection error", e);
      }
    };

    interval = setInterval(detect, 500);
    return () => clearInterval(interval);
  }, [stream, error, onResult, onClose]);

  if (error) {
     return (
         <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center">
             <p className="text-white mb-4">{error}</p>
             <button onClick={onClose} className="px-4 py-2 bg-white text-black rounded-full">Close</button>
         </div>
     );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-nous-accent -mt-1 -ml-1 rounded-tl-lg"/>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-nous-accent -mt-1 -mr-1 rounded-tr-lg"/>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-nous-accent -mb-1 -ml-1 rounded-bl-lg"/>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-nous-accent -mb-1 -mr-1 rounded-br-lg"/>
            </div>
        </div>

        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-sm"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-white/80 text-sm bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                Point camera at a barcode
            </p>
        </div>
    </div>
  );
};
