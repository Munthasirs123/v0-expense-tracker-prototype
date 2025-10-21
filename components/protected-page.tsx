// components/protected-page.tsx

"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from './auth-provider';
import { Loader2 } from 'lucide-react';

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, supabase } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    // We use a listener to handle the case where the initial session is still loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && session === null) {
        router.replace('/login');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);
  
  // While we wait for the user session to be determined, show a loader
  if (user === undefined) {
      return (
          <div className="min-h-screen bg-background flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  // If the user is logged in, show the page content.
  if (user) {
    return <>{children}</>;
  }

  // If the user is definitively logged out, this component will have already triggered a redirect.
  // Returning null prevents a flash of content.
  return null; 
}