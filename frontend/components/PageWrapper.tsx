import { useRouter } from 'next/router';
import React from 'react';

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  return (
    <div
      key={router.pathname}
      className="w-full min-h-full transition-opacity duration-300 ease-out"
    >
      {children}
    </div>
  );
};

export default PageWrapper;