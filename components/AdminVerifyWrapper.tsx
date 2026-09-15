'use client';

import { useState, useEffect } from 'react';
import DashboardUI from './DashboardUI';
import AdminVerify from './AdminVerify';
import Logo from '@/components/Logo';

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
            <div className="flex h-screen w-full flex-col items-center justify-center bg-brand-bg transition-colors duration-200">
                <div className="scale-150 mb-6 animate-pulse">
                    <Logo size="md" showText={false} />
                </div>
                <p className="text-brand-muted tracking-widest font-mono text-xs uppercase animate-pulse">Establishing secure uplink...</p>
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
