import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

import HeatMapPage from '@/components/HeatMapPage';

export default async function HeatMapPagePageWrapper() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const userData = {
        id: user.id,
        email: user.email || '',
        firstName: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Operator',
        lastName: user.user_metadata?.last_name || '',
    };

    return <HeatMapPage user={userData} />;
}
