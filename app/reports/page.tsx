import { getSessionUser } from '@/lib/demoAuthServer';
import { redirect } from 'next/navigation';

import ReportsPage from '@/components/ReportsPage';

export default async function ReportsPagePageWrapper() {
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

    return <ReportsPage user={userData} />;
}
