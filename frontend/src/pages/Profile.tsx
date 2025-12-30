import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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

        try {
            const res = await api.put("/users/me", formData);
            setUser(res.data);
            alert("Profile updated successfully!");
        } catch (err: any) {
            console.error("Failed to update profile", err);
            const errorMsg = err.response?.data?.detail || "Failed to update profile";
            setError(errorMsg);
            alert(errorMsg);
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
                alert("Please select a valid image file (PNG, JPG, JPEG, GIF, or WEBP)");
                return;
            }

            // Validate file size (max 5MB)
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert("File size must be less than 5MB");
                return;
            }

            setFile(selectedFile);

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
            alert("Please select a file first");
            return;
        }

        setUploading(true);
        setError(null);

        const data = new FormData();
        data.append("file", file);

        try {
            const res = await api.post("/users/me/upload-profile-picture", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setUser(res.data);

            // Clean up
            setFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }

            // Reset file input
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = "";

            alert("Profile picture updated successfully!");
        } catch (err: any) {
            console.error("Failed to upload picture", err);
            const errorMsg = err.response?.data?.detail || "Failed to upload picture";
            setError(errorMsg);
            alert(errorMsg);
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

        try {
            await api.delete("/users/me/profile-picture");
            setUser({ ...user, profile_picture: undefined });
            alert("Profile picture deleted successfully!");
        } catch (err: any) {
            console.error("Failed to delete picture", err);
            const errorMsg = err.response?.data?.detail || "Failed to delete picture";
            setError(errorMsg);
            alert(errorMsg);
        }
    };

    // Get profile picture URL
    const getProfilePictureUrl = () => {
        if (previewUrl) {
            return previewUrl;
        }
        if (user?.profile_picture) {
            // Handle both relative and absolute paths
            if (user.profile_picture.startsWith("http")) {
                return user.profile_picture;
            }
            // Construct proper URL - adjust base URL as needed
            const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
            return `${baseUrl}/uploads/${user.profile_picture}`;
        }
        return "/default-avatar.png";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-purple-600 font-semibold">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-500 font-semibold text-xl mb-4">User not found</p>
                    {error && <p className="text-gray-600">{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 mt-10">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-8">
                    <h1 className="text-3xl font-bold text-white">My Profile</h1>
                    <p className="text-purple-100 mt-2">Manage your personal information</p>
                </div>

                <div className="p-6 sm:p-8">
                    {/* Error Display */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Profile Picture Section */}
                        <div className="flex flex-col items-center lg:w-1/3">
                            <div className="relative mb-4">
                                <img
                                    src={getProfilePictureUrl()}
                                    alt="Profile"
                                    className="w-40 h-40 rounded-full object-cover border-4 border-purple-200 shadow-lg"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/default-avatar.png";
                                    }}
                                />
                                {user.profile_picture && !previewUrl && (
                                    <button
                                        onClick={handleDeletePicture}
                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition"
                                        title="Delete profile picture"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <div className="w-full space-y-3">
                                <label className="block">
                                    <span className="sr-only">Choose profile photo</span>
                                    <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer text-center border border-gray-300">
                                        <span className="text-sm font-medium">
                                            {file ? "Change File" : "Choose File"}
                                        </span>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                            className="hidden"
                                        />
                                    </div>
                                </label>

                                {file && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-600 text-center truncate px-2">
                                            {file.name}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-purple-300 disabled:cursor-not-allowed text-sm font-medium"
                                                onClick={handleUpload}
                                                disabled={uploading}
                                            >
                                                {uploading ? "Uploading..." : "Upload"}
                                            </button>
                                            <button
                                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm font-medium"
                                                onClick={handleCancelUpload}
                                                disabled={uploading}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-gray-500 text-center">
                                    Max 5MB • PNG, JPG, GIF, WEBP
                                </p>
                            </div>
                        </div>

                        {/* Profile Form Section */}
                        <div className="flex-1">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Enter your phone number"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        placeholder="Tell us about yourself..."
                                        rows={4}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none resize-none transition"
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={updateLoading}
                                        className="px-8 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-purple-300 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                                    >
                                        {updateLoading ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;