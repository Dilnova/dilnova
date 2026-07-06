'use client';

import React from 'react';

interface PrintButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function PrintButton({ children, ...props }: PrintButtonProps) {
  return (
    <button onClick={() => window.print()} {...props}>
      {children}
    </button>
  );
}
