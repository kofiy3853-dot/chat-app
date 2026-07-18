import React from 'react';

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-full min-h-full">
      {children}
    </div>
  );
};

export default PageWrapper;
