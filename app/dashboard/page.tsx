import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/demoAuthServer';
import AdminVerifyWrapper from '@/components/AdminVerifyWrapper';

export default async function DashboardPage() {
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

  return <AdminVerifyWrapper user={userData} />;
}
