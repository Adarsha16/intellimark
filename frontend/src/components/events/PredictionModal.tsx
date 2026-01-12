import { useState } from 'react';
import { X, TrendingUp, AlertTriangle, CheckCircle, Target, Zap, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface SuccessMetric {
    name: string;
    score: number;
    explanation: string;
}

interface PredictionData {
    overall_score: number;
    risk_level: string;
    predicted_attendance: string;
    revenue_potential: string;
    metrics: SuccessMetric[];
    recommendations: string[];
    strengths: string[];
    warnings: string[];
}

interface PredictionModalProps {
    isOpen: boolean;
    onClose: () => void;
    prediction: PredictionData | null;
    isLoading: boolean;
    eventName: string;
    eventId: number | null;
    onOptimizationComplete?: () => void;
}

export default function PredictionModal({ isOpen, onClose, prediction, isLoading, eventName, eventId, onOptimizationComplete }: PredictionModalProps) {
    const [isOptimizing, setIsOptimizing] = useState(false);

    if (!isOpen) return null;

    const getScoreColor = (score: number) => {
        if (score >= 75) return 'text-emerald-500';
        if (score >= 55) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreBg = (score: number) => {
        if (score >= 75) return 'from-emerald-500 to-teal-500';
        if (score >= 55) return 'from-amber-500 to-orange-500';
        return 'from-red-500 to-pink-500';
    };

    const getRiskBadge = (risk: string) => {
        switch (risk) {
            case 'Low': return 'bg-emerald-100 text-emerald-700';
            case 'Medium': return 'bg-amber-100 text-amber-700';
            case 'High': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const handleAutoFix = async () => {
        if (!eventId) return;
        setIsOptimizing(true);
        const loadId = toast.loading("AI is optimizing your event details...");

        try {
            await api.post(`/marketing/${eventId}/optimize`);
            toast.success("Event Optimized Successfully! Recalculating score...", { id: loadId });
            onOptimizationComplete?.();
        } catch (e) {
            toast.error("Failed to optimize event", { id: loadId });
        } finally {
            setIsOptimizing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">AI Success Predictor</h2>
                            <p className="text-white/80 text-sm">Analyzing "{eventName}"</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <h3 className="text-lg font-bold text-slate-800">Analyzing Event...</h3>
                        <p className="text-slate-500">Running AI prediction models</p>
                    </div>
                ) : prediction ? (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Overall Score Card */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`bg-gradient-to-br ${getScoreBg(prediction.overall_score)} p-6 rounded-2xl text-white text-center`}
                        >
                            <p className="text-white/80 text-sm font-medium mb-2">OVERALL SUCCESS SCORE</p>
                            <div className="text-6xl font-black mb-2">{prediction.overall_score}</div>
                            <div className="flex justify-center gap-3 mt-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskBadge(prediction.risk_level)}`}>
                                    {prediction.risk_level} Risk
                                </span>
                            </div>
                        </motion.div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-xs text-slate-500 font-medium">PREDICTED ATTENDANCE</p>
                                <p className="text-lg font-bold text-slate-800">{prediction.predicted_attendance}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-xs text-slate-500 font-medium">REVENUE POTENTIAL</p>
                                <p className="text-lg font-bold text-slate-800">{prediction.revenue_potential}</p>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Score Breakdown
                            </h3>
                            {prediction.metrics.map((metric, i) => (
                                <div key={i} className="bg-slate-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-slate-700">{metric.name}</span>
                                        <span className={`font-bold ${getScoreColor(metric.score)}`}>{metric.score}/100</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${metric.score}%` }}
                                            transition={{ duration: 0.5, delay: i * 0.1 }}
                                            className={`h-full bg-gradient-to-r ${getScoreBg(metric.score)}`}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{metric.explanation}</p>
                                </div>
                            ))}
                        </div>

                        {/* Strengths & Warnings */}
                        {prediction.strengths.length > 0 && (
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <h4 className="font-bold text-emerald-700 flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-4 h-4" /> Strengths
                                </h4>
                                <ul className="space-y-1">
                                    {prediction.strengths.map((s, i) => (
                                        <li key={i} className="text-sm text-emerald-700">✓ {s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {prediction.warnings.length > 0 && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <h4 className="font-bold text-amber-700 flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4" /> Warnings
                                </h4>
                                <ul className="space-y-1">
                                    {prediction.warnings.map((w, i) => (
                                        <li key={i} className="text-sm text-amber-700">⚠ {w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendations */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <h4 className="font-bold text-indigo-700 flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4" /> AI Recommendations
                            </h4>
                            <ul className="space-y-2 mb-4">
                                {prediction.recommendations.map((rec, i) => (
                                    <li key={i} className="text-sm text-indigo-700 flex items-start gap-2">
                                        <span className="text-indigo-400">→</span> {rec}
                                    </li>
                                ))}
                            </ul>

                            {/* Auto-Optimization Button */}
                            <button
                                onClick={handleAutoFix}
                                disabled={isOptimizing}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                            >
                                {isOptimizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-yellow-300" />}
                                {isOptimizing ? "Optimizing Event Details..." : "Auto-Fix (Title & Description)"}
                            </button>
                            <p className="text-xs text-indigo-400 text-center mt-2">
                                AI will rewrite your title and description to maximize score.
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
