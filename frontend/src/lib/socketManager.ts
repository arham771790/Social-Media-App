'use client';

import { io, Socket } from 'socket.io-client';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

class SocketManager {
    private socket: Socket | null = null;
    private token: string | null = null;

    connect(token: string): Socket {
        if (this.socket?.connected && this.token === token) {
            return this.socket;
        }

        if (this.socket) {
            this.socket.disconnect();
        }

        this.token = token;
        this.socket = io(BASE_URL, {
            withCredentials: true,
            autoConnect: true,
            transports: ['websocket'],
            auth: { token },
        });

        this.socket.on('connect_error', (err) => {
            console.warn('Socket connection error:', err.message);
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.token = null;
        }
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    // Room management
    joinRoom(chatGroupId: string): Promise<{ ok: boolean; error?: string }> {
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ ok: false, error: 'Socket not connected' });
            this.socket.emit('room:join', { chatGroupId }, (ack: any) => resolve(ack || { ok: true }));
        });
    }

    leaveRoom(chatGroupId: string): Promise<{ ok: boolean; error?: string }> {
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ ok: false, error: 'Socket not connected' });
            this.socket.emit('room:leave', { chatGroupId }, (ack: any) => resolve(ack || { ok: true }));
        });
    }

    // Typing indicators
    emitTyping(kind: 'start' | 'stop', payload: { chatGroupId: string;[key: string]: any }) {
        if (!this.socket) return;
        const evt = kind === 'start' ? 'typing:start' : 'typing:stop';
        this.socket.emit(evt, { ...payload, roomId: payload.chatGroupId });
    }

    // WebRTC Signaling
    ring(roomId: string, data: { fromUser: any; mode?: 'audio' | 'video' }) {
        this.socket?.emit('call:ring', { roomId, ...data });
    }

    sendOffer(roomId: string, sdp: RTCSessionDescriptionInit, fromUser: any) {
        this.socket?.emit('call:offer', { roomId, sdp, fromUser });
    }

    sendAnswer(roomId: string, sdp: RTCSessionDescriptionInit, fromUser: any) {
        this.socket?.emit('call:answer', { roomId, sdp, fromUser });
    }

    sendCandidate(roomId: string, candidate: RTCIceCandidateInit, fromUser: any) {
        this.socket?.emit('call:candidate', { roomId, candidate, fromUser });
    }

    endCall(roomId: string, reason: string = 'user_end') {
        this.socket?.emit('call:end', { roomId, reason });
    }
}

export const socketManager = new SocketManager();
export default socketManager;
