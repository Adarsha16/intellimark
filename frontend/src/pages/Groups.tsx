import { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Groups() {
    const [groups, setGroups] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');

    // Member adding state
    const [addingToGroupId, setAddingToGroupId] = useState<number | null>(null);
    const [emailToAdd, setEmailToAdd] = useState('');

    const fetchGroups = async () => {
        try {
            const res = await api.get('/groups/');
            setGroups(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchGroups(); }, []);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/groups/', { name: newGroupName, description: newGroupDesc });
            toast.success("Group created");
            setIsCreateOpen(false);
            setNewGroupName('');
            setNewGroupDesc('');
            fetchGroups();
        } catch (err) { toast.error("Failed to create group"); }
    };

    const handleDeleteGroup = async (id: number) => {
        if (!confirm("Delete this group?")) return;
        await api.delete(`/groups/${id}`);
        fetchGroups();
    };

    const handleAddMember = async (groupId: number) => {
        if (!emailToAdd) return;
        try {
            await api.post(`/groups/${groupId}/add/${emailToAdd}`);
            toast.success("Member added");
            setEmailToAdd('');
            setAddingToGroupId(null);
            fetchGroups();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to add member");
        }
    };

    const handleRemoveMember = async (groupId: number, userId: number) => {
        if (!confirm("Remove user from group?")) return;
        await api.delete(`/groups/${groupId}/remove/${userId}`);
        toast.success("Removed");
        fetchGroups();
    };

    return (
        <div className="space-y-8">
            <Toaster position="top-right" />
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Member Groups</h1>
                    <p className="text-slate-500">Organize members into clubs, committees, or teams.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Create Group
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                    {groups.map((group) => (
                        <motion.div
                            key={group.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                                    <p className="text-sm text-slate-500">{group.description}</p>
                                </div>
                                <button onClick={() => handleDeleteGroup(group.id)} className="text-slate-400 hover:text-red-500 transition">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Members ({group.members.length})</h4>
                                    <button
                                        onClick={() => setAddingToGroupId(group.id)}
                                        className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
                                    >
                                        <UserPlus className="w-3 h-3" /> Add Member
                                    </button>
                                </div>

                                {addingToGroupId === group.id && (
                                    <div className="mb-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
                                        <input
                                            className="flex-1 border p-1.5 text-sm rounded bg-slate-50"
                                            placeholder="Enter user email..."
                                            value={emailToAdd}
                                            onChange={e => setEmailToAdd(e.target.value)}
                                        />
                                        <Button onClick={() => handleAddMember(group.id)}>Add</Button>
                                        <button onClick={() => setAddingToGroupId(null)} className="p-2 text-slate-400"><X className="w-4 h-4" /></button>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {group.members.length === 0 ? (
                                        <p className="text-sm text-slate-400 italic">No members yet.</p>
                                    ) : (
                                        group.members.map((member: any) => (
                                            <div key={member.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg group hover:bg-slate-100 transition">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                        {member.email[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-slate-700">{member.email}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveMember(group.id, member.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">Create New Group</h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <input className="w-full border p-2 rounded-lg" placeholder="Group Name (e.g. Robotics Club)" required value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                            <textarea className="w-full border p-2 rounded-lg" placeholder="Description" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} />
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit">Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}