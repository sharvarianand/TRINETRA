import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-6 transition-colors duration-200">
      <SignIn appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
        }
      }} />
    </div>
  );
}
