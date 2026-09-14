import { redirect } from 'next/navigation';

export async function GET() {
  redirect('/sign-in');
}

export async function POST() {
  redirect('/sign-in');
}
