import { getSessionUser } from '@/lib/demoAuthServer';
import { redirect } from 'next/navigation';

import AnalysisPage from '@/components/AnalysisPage';

export default async function AnalysisPagePageWrapper() {
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

    return <AnalysisPage user={userData} />;
}
