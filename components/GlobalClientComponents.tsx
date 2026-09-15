'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import FloatingEmergencyButton from '@/components/FloatingEmergencyButton';

// Pages where the emergency button should appear (protected routes after login)
const protectedPaths = ['/dashboard', '/settings', '/heatmap', '/analysis', '/reports'];

export default function GlobalClientComponents() {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check if admin is verified (authenticated)
        const adminVerified = sessionStorage.getItem('adminVerified') === 'true';
        setIsAuthenticated(adminVerified);
    }, [pathname]); // Re-check when pathname changes

    // Only show emergency button on protected routes AND when authenticated
    const isProtectedRoute = protectedPaths.some(path => pathname?.startsWith(path));
    const showEmergencyButton = isProtectedRoute && isAuthenticated;

    return (
        <>
            {showEmergencyButton && (
                <FloatingEmergencyButton
                    baseUrl="http://localhost:8000"
                    defaultZone="TRINETRA Monitoring"
                />
            )}
        </>
    );
}

