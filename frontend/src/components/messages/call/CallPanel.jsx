"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Camera, CameraOff, Timer } from "lucide-react";
import useCall from "@/hooks/useCall";

export default function CallPanel({ open, onOpenChange, roomId, mode = "audio" }) {
  const { localRef, remoteRef, start, end, duration, running } = useCall({ roomId, mode });

  useEffect(() => {
    if (open) start();
    // end call when modal closes
    return () => { if (open) end(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="radix-dialog-content sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            {format(duration)}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          {mode === "video" ? (
            <div className="grid grid-cols-2 gap-2">
              <video ref={localRef} autoPlay muted playsInline className="w-full rounded bg-black" />
              <video ref={remoteRef} autoPlay playsInline className="w-full rounded bg-black" />
            </div>
          ) : (
            <audio ref={remoteRef} autoPlay />
          )}

          <div className="flex items-center justify-center gap-2 pt-2">
            {/* You can wire mute/camera toggles via tracks if you like; placeholders below */}
            <Button variant="secondary" size="icon" title="Toggle mic">
              <Mic className="w-4 h-4" />
            </Button>
            {mode === "video" && (
              <Button variant="secondary" size="icon" title="Toggle camera">
                <Camera className="w-4 h-4" />
              </Button>
            )}
            <Button variant="destructive" onClick={end}>
              <PhoneOff className="w-4 h-4 mr-2" /> End call
            </Button>
          </div>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

function format(s) {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
