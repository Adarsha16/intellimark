import { X, Handshake, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { type SponsorMatch } from '../../types';
import toast from 'react-hot-toast';

interface SponsorModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: SponsorMatch[];
    eventName: string;
}

export default function SponsorModal({ isOpen, onClose, matches, eventName }: SponsorModalProps) {

    const handleContact = (sponsor: SponsorMatch) => {
        if (!sponsor.contact_email) {
            toast.error("No email address found for this sponsor.");
            return;
        }
        const subject = encodeURIComponent(`Sponsorship Opportunity: ${eventName}`);
        const body = encodeURIComponent(`Hi ${sponsor.company_name},\n\nWe would love to discuss a partnership for ${eventName}.\n\nBest regards,`);
        window.location.href = `mailto:${sponsor.contact_email}?subject=${subject}&body=${body}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900">AI Sponsor Matches</h3>
                        <p className="text-sm text-slate-500">For <span className="font-semibold text-indigo-600">{eventName}</span></p>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {matches.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Handshake className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No suitable sponsors found.</p>
                        </div>
                    ) : (
                        matches.map((match) => {
                            const pct = Math.round(match.match_score * 100);
                            const color = pct > 70 ? "bg-emerald-500" : pct > 40 ? "bg-amber-500" : "bg-red-500";

                            return (
                                <div key={match.sponsor_id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:shadow-md transition-all">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${color}`}>{pct}%</div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900">{match.company_name}</h4>
                                        <p className="text-xs text-slate-500">{match.notes || "No notes available"}</p>
                                    </div>
                                    <Button variant="outline" className="text-xs gap-2" onClick={() => handleContact(match)}>
                                        <Mail className="w-3 h-3" /> Contact
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </div>
    );
}