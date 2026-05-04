"use client";

import { useCallStore } from "@/store/callStore";
import CallPanel from "@/components/messages/call/CallPanel";

export default function CallPanelHost() {
  const open = useCallStore((s) => s.ui.open);
  const roomId = useCallStore((s) => s.ui.roomId);
  const mode = useCallStore((s) => s.ui.mode);
  const isCaller = useCallStore((s) => s.ui.isCaller);
  const setOpen = useCallStore((s) => s.uiSetOpen);

  return (
    <CallPanel
      open={open}
      onOpenChange={(v) => setOpen(v)}
      roomId={roomId}
      mode={mode}
      isCaller={isCaller}
    />
  );
}
