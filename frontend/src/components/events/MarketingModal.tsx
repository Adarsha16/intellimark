import { X, Megaphone, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface MarketingData {
    strategy: string;
    target_audience: string;
    key_selling_points: string[];
    social_posts: {
        platform: string;
        content: string;
        hashtags: string[];
    }[];
}

interface MarketingModalProps {
    isOpen: boolean;
    onClose: () => void;
    marketingData: MarketingData | null;
    isLoading: boolean;
    eventName: string;
}

export default function MarketingModal({ isOpen, onClose, marketingData, isLoading, eventName }: MarketingModalProps) {
    const [activeTab, setActiveTab] = useState<'strategy' | 'social'>('strategy');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast could replace this alert
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                            <Megaphone className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">EventPulse AI</h2>
                            <p className="text-white/80 text-sm">Marketing Strategy for "{eventName}"</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                        <h3 className="text-lg font-bold text-slate-800">Generating Strategy...</h3>
                        <p className="text-slate-500">Analyzing target audience and crafting social posts.</p>
                    </div>
                ) : marketingData ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200">
                            <button
                                onClick={() => setActiveTab('strategy')}
                                className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'strategy' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Strategy & Audience
                            </button>
                            <button
                                onClick={() => setActiveTab('social')}
                                className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'social' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Social Media Content
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            <AnimatePresence mode='wait'>
                                {activeTab === 'strategy' ? (
                                    <motion.div
                                        key="strategy"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Core Strategy</h3>
                                            <p className="text-lg font-medium text-slate-800">{marketingData.strategy}</p>
                                        </div>

                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Target Audience</h3>
                                            <p className="text-slate-700">{marketingData.target_audience}</p>
                                        </div>

                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Key Selling Points</h3>
                                            <ul className="space-y-2">
                                                {marketingData.key_selling_points.map((point, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-slate-700">
                                                        <Check className="w-5 h-5 text-green-500 shrink-0" />
                                                        <span>{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="social"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {marketingData.social_posts.map((post, i) => (
                                            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                                    <span className="font-bold text-slate-700 text-sm">{post.platform}</span>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => copyToClipboard(`${post.content} ${post.hashtags.join(' ')}`)}
                                                        className="text-indigo-600 h-8 px-3 text-xs"
                                                    >
                                                        <Copy className="w-3 h-3 mr-1" /> Copy
                                                    </Button>
                                                </div>
                                                <div className="p-4">
                                                    <p className="text-slate-800 whitespace-pre-wrap">{post.content}</p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {post.hashtags.map((tag, j) => (
                                                            <span key={j} className="text-indigo-500 text-sm font-medium">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
