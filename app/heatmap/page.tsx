import { getSessionUser } from '@/lib/demoAuthServer';
import { redirect } from 'next/navigation';

import HeatMapPage from '@/components/HeatMapPage';

export default async function HeatMapPagePageWrapper() {
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

    return <HeatMapPage user={userData} />;
}
