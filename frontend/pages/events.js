import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function EventsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/campus');
  }, [router]);
  return null;
}
