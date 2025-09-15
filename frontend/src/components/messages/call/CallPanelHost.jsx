"use client";

import { useEffect, useMemo, useRef } from "react";
import { useCallStore } from "@/store/callStore";
import CallPanel from "@/components/messages/call/CallPanel"; // reuse your panel

export default function CallPanelHost() {
  // Single source of truth for the active panel, visible on every page
  const open = useCallStore((s) => s.ui.open);
  const roomId = useCallStore((s) => s.ui.roomId);
  const mode = useCallStore((s) => s.ui.mode);
  const setOpen = useCallStore((s) => s.uiSetOpen);

  // CallPanel will manage the peer connection; we just mount/unmount it here
  return (
    <CallPanel
      open={open}
      onOpenChange={(v) => setOpen(v)}
      roomId={roomId}
      mode={mode}
    />
  );
}
