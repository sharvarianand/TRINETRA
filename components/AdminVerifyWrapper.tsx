'use client';

import { useState, useEffect } from 'react';
import DashboardUI from './DashboardUI';
import AdminVerify from './AdminVerify';
import { Shield } from 'lucide-react';

interface User {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
}

export default function AdminVerifyWrapper({ user }: { user: User }) {
    const [isVerified, setIsVerified] = useState<boolean | null>(null);

    useEffect(() => {
        // Check if admin is already verified in this session
        const verified = localStorage.getItem('TRINETRA_admin_verified') === 'true';
        setIsVerified(verified);
    }, []);

    // Show loading state while checking
    if (isVerified === null) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-white dark:bg-zinc-900 transition-colors duration-200">
                <div className="w-16 h-16 rounded-2xl bg-cyan-600 flex items-center justify-center mb-4 animate-pulse">
                    <Shield className="w-8 h-8 text-white" />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">Checking access...</p>
            </div>
        );
    }

    // Show admin verification if not verified
    if (!isVerified) {
        return <AdminVerify user={user} />;
    }

    // Show dashboard if verified
    return <DashboardUI user={user} />;
}
