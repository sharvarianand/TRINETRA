import { getSessionUser } from '@/lib/demoAuthServer';
import { redirect } from 'next/navigation';

import SettingsPage from '@/components/SettingsPage';

export default async function SettingsPagePageWrapper() {
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

    return <SettingsPage user={userData} />;
}
