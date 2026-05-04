// src/components/messages/ChatHeader.jsx
 "use client";

 import { Phone, Video, Info, Menu, ArrowLeft } from "lucide-react";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { useAuthStore } from "@/store/authStore";
 import { useMessageStore } from "@/store/messageStore";
 import { useCallStore } from "@/store/callStore";

 export default function ChatHeader({
   thread,
   onToggleSidebar,
   onBack,
   showBackOnMobile,
   hasActive,
   onToggleInfo = () => {},
 }) {
   const startCall = useCallStore((s) => s.startCallFromThread);
   const me = useAuthStore((s) => s.user);
   const onlineIds = useMessageStore((s) => s.onlineUserIds);

   if (!thread) {
     return (
       <div className="h-16 border-b border-border bg-background/60 backdrop-blur" />
     );
   }

   const name = thread?.name;
   const memberCount = Array.isArray(thread?.members)
     ? thread.members.length
     : 0;

   const myId = String(me?.id ?? "");
   const other =
     thread?.type === "DIRECT"
       ? (thread?.members || []).find((m) => String(m?.id ?? "") !== myId)
       : null;

   const otherOnline = other ? onlineIds.has(String(other?.id ?? "")) : false;
   const callEnabled = thread?.type === "DIRECT";

   return (
     <>
       <div className="h-16 border-b border-border flex items-center justify-between px-3 md:px-4 bg-background/60 backdrop-blur">
         <div className="flex items-center gap-3 min-w-0 flex-1">
           {showBackOnMobile && hasActive ? (
             <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back">
               <ArrowLeft className="w-5 h-5" />
             </Button>
           ) : (
             <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleSidebar} aria-label="Open conversations">
               <Menu className="w-5 h-5" />
             </Button>
           )}

           <div className="relative">
             <Avatar className="w-9 h-9 md:w-10 md:h-10">
               <AvatarImage src={thread?.avatar || undefined} />
               <AvatarFallback>{name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
             </Avatar>
           </div>

           <div className="min-w-0 flex-1">
             <div className="flex items-center gap-2">
               <span className="font-semibold truncate">{name}</span>
               {thread?.type === "GROUP" && (
                 <Badge variant="secondary" className="text-xs">
                   {memberCount} members
                 </Badge>
               )}
             </div>
             <div className="text-xs text-muted-foreground">
               {thread?.type === "DIRECT"
                 ? otherOnline ? "Online" : "Offline"
                 : `${memberCount} members`}
             </div>
           </div>
         </div>

         <div className="flex items-center gap-1">
           <Button
             size="icon"
             variant="ghost"
             onClick={() => startCall(thread.id, "audio")}
             title="Audio call"
             aria-label="Audio call"
             disabled={!callEnabled}
           >
             <Phone className="w-5 h-5" />
           </Button>
           <Button
             size="icon"
             variant="ghost"
             onClick={() => startCall(thread.id, "video")}
             title="Video call"
             aria-label="Video call"
             disabled={!callEnabled}
           >
             <Video className="w-5 h-5" />
           </Button>
           <Button size="icon" variant="ghost" title="Chat info" aria-label="Chat info" onClick={onToggleInfo}>
             <Info className="w-5 h-5" />
           </Button>
         </div>
       </div>
     </>
   );
 }
