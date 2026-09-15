import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

import ReportsPage from '@/components/ReportsPage';


export default async function Reports() {
    const supabase = await createClient();
    const { data: { user: clerkUser } } = await supabase.auth.getUser();

    if (!clerkUser) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white gap-4">
                <h1 className="text-3xl font-bold tracking-widest text-cyan-500">TRINETRA ACCESS RESTRICTED</h1>
                <div className="flex gap-4">
                    <SignInButton mode="modal">
                        <button className="px-6 py-2 bg-cyan-900/30 border border-cyan-500/50 rounded text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                            LOGIN
                        </button>
                    </SignInButton>
                </div>
            </div>
        );
    }

    const user = {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
    };

    return <ReportsPage user={user} />;
}

