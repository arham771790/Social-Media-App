'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CredentialsCard() {
    const [copiedField, setCopiedField] = useState(null);

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all hover:border-white/20">
            <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="relative">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                    Instant Access
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Email Field */}
                <div className="group relative overflow-hidden bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left flex-1">
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Test Email</div>
                            <div className="text-sm font-mono text-blue-300 group-hover:text-blue-200 transition-colors">test123@gmail.com</div>
                        </div>
                        <button
                            onClick={() => copyToClipboard('test123@gmail.com', 'email')}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-95"
                            aria-label="Copy email"
                        >
                            {copiedField === 'email' ? (
                                <Check className="w-4 h-4 text-green-400" />
                            ) : (
                                <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                            )}
                        </button>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/5 to-blue-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </div>

                {/* Password Field */}
                <div className="group relative overflow-hidden bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-orange-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left flex-1">
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Test Password</div>
                            <div className="text-sm font-mono text-orange-300 group-hover:text-orange-200 transition-colors">Password</div>
                        </div>
                        <button
                            onClick={() => copyToClipboard('Password', 'password')}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-95"
                            aria-label="Copy password"
                        >
                            {copiedField === 'password' ? (
                                <Check className="w-4 h-4 text-green-400" />
                            ) : (
                                <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                            )}
                        </button>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600/0 via-orange-600/5 to-orange-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </div>
            </div>
        </div>
    );

}
