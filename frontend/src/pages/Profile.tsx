import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Mail, Phone, User as UserIcon, Save, Trash2, Upload, Loader2, Image as ImageIcon, X, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import api from "../services/api";

interface UserProfile {
    id: number;
    email: string;
    name?: string;
    phone?: string;
    bio?: string;
    profile_picture?: string;
    role: string;
}

const Profile = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        bio: "",
    });
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setError(null);
                const res = await api.get("/users/me");
                setUser(res.data);
                setFormData({
                    name: res.data.name || "",
                    phone: res.data.phone || "",
                    bio: res.data.bio || "",
                });
                setImageError(false);
            } catch (err: any) {
                console.error("Failed to fetch profile", err);
                const errorMsg = err.response?.data?.detail || "Failed to load profile";
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Reset image error when file changes
    useEffect(() => {
        setImageError(false);
    }, [user?.profile_picture, previewUrl]);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    // Handle form field changes
    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle profile update
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setUpdateLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await api.put("/users/me", formData);
            setUser(res.data);
            setSuccess("Profile updated successfully!");
        } catch (err: any) {
            console.error("Failed to update profile", err);
            const errorMsg = err.response?.data?.detail || "Failed to update profile";
            setError(errorMsg);
        } finally {
            setUpdateLoading(false);
        }
    };

    // Handle file selection
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

            // Validate file type
            const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
            if (!validTypes.includes(selectedFile.type)) {
                setError("Please select a valid image file (PNG, JPG, JPEG, GIF, or WEBP)");
                return;
            }

            // Validate file size (max 5MB)
            if (selectedFile.size > 5 * 1024 * 1024) {
                setError("File size must be less than 5MB");
                return;
            }

            setFile(selectedFile);
            setError(null);

            // Clean up previous preview URL
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            // Create new preview URL
            const newPreviewUrl = URL.createObjectURL(selectedFile);
            setPreviewUrl(newPreviewUrl);
        }
    };

    // Handle file upload
    const handleUpload = async () => {
        if (!file || !user) {
            setError("Please select a file first");
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);

        const data = new FormData();
        data.append("file", file);

        try {
            const res = await api.post("/users/me/upload-profile-picture", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setUser(res.data);
            setSuccess("Profile picture updated successfully!");

            // Clean up
            setFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }

            // Reset file input
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = "";

        } catch (err: any) {
            console.error("Failed to upload picture", err);
            const errorMsg = err.response?.data?.detail || "Failed to upload picture";
            setError(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    // Cancel file selection
    const handleCancelUpload = () => {
        setFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    // Delete profile picture
    const handleDeletePicture = async () => {
        if (!user?.profile_picture) return;

        if (!confirm("Are you sure you want to delete your profile picture?")) {
            return;
        }

        setError(null);
        setSuccess(null);

        try {
            await api.delete("/users/me/profile-picture");
            // Optimistic update
            if (user) {
                setUser({ ...user, profile_picture: undefined });
            }
            setSuccess("Profile picture deleted successfully!");
        } catch (err: any) {
            console.error("Failed to delete picture", err);
            const errorMsg = err.response?.data?.detail || "Failed to delete picture";
            setError(errorMsg);
        }
    };

    // Get profile picture URL
    const getProfilePictureUrl = () => {
        if (previewUrl) {
            return previewUrl;
        }
        if (user?.profile_picture) {
            if (user.profile_picture.startsWith("http")) {
                return user.profile_picture;
            }
            const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
            return `${baseUrl}/uploads/${user.profile_picture}`;
        }
        return null;
    };

    const getInitials = (name?: string) => {
        const source = name || user?.email || "?";
        return source.substring(0, 2).toUpperCase();
    };

    const profileUrl = getProfilePictureUrl();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto mb-4" />
                    <p className="text-violet-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-red-100 table-auto">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-semibold text-xl mb-2">User not found</p>
                    <p className="text-slate-500">{error || "Please try logging in again"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-xl shadow-indigo-100 overflow-hidden border border-slate-100"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-8 py-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <h1 className="text-3xl font-bold relative z-10">My Profile</h1>
                        <p className="text-violet-100 mt-2 relative z-10 flex items-center gap-2">
                            Manage your personal information
                        </p>
                    </div>

                    <div className="p-8">
                        {/* Alerts */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-red-700 text-sm flex-1">{error}</p>
                                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3"
                                >
                                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                    <p className="text-green-700 text-sm flex-1">{success}</p>
                                    <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            {/* Left Column: Avatar & Actions */}
                            <div className="flex flex-col items-center space-y-6">
                                <div className="relative group">
                                    <div className="w-48 h-48 rounded-full border-4 border-white shadow-lg overflow-hidden bg-violet-100 flex items-center justify-center relative ring-4 ring-violet-50">
                                        {profileUrl && !imageError ? (
                                            <img
                                                src={profileUrl}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                                onError={() => setImageError(true)}
                                            />
                                        ) : (
                                            <span className="text-5xl font-bold text-violet-500 select-none">
                                                {getInitials(user.name)}
                                            </span>
                                        )}

                                        {/* Overlay for editing */}
                                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                                            <div className="text-white flex flex-col items-center gap-1">
                                                <Camera className="w-8 h-8" />
                                                <span className="text-xs font-medium">Change Photo</span>
                                            </div>
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {/* Delete Button (conditionally shown) */}
                                    {user.profile_picture && !previewUrl && (
                                        <button
                                            onClick={handleDeletePicture}
                                            className="absolute top-0 right-0 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition shadow-sm border border-white"
                                            title="Delete profile picture"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="text-center">
                                    <h2 className="text-xl font-bold text-slate-800">{user.name || "User"}</h2>
                                    <p className="text-slate-500 text-sm">{user.email}</p>
                                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold uppercase tracking-wide">
                                        {user.role}
                                    </div>
                                </div>

                                {file && (
                                    <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                                <ImageIcon className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={handleCancelUpload}
                                                disabled={uploading}
                                                className="w-full text-xs"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleUpload}
                                                disabled={uploading}
                                                className="w-full text-xs bg-violet-600 hover:bg-violet-700 text-white"
                                            >
                                                {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                                                Upload
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Profile Form */}
                            <div className="lg:col-span-2">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-slate-400" />
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={user.email}
                                                disabled
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed focus:outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                <UserIcon className="w-4 h-4 text-slate-400" />
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="Enter your full name"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="Enter your phone number"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Bio</label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            rows={5}
                                            placeholder="Tell us a little about yourself..."
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none resize-none"
                                        />
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={updateLoading}
                                            className="px-8 bg-violet-600 hover:bg-violet-700 text-white min-w-[140px]"
                                        >
                                            {updateLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Profile;