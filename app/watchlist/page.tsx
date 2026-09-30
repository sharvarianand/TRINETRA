import { getSessionUser } from '@/lib/demoAuthServer';
import { redirect } from 'next/navigation';

import WatchlistPage from '@/components/WatchlistPage';

export default async function WatchlistPagePageWrapper() {
    const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  const userData = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };

    return <WatchlistPage />;
}

