import React from 'react';

interface LoadingProps {
  text?: string;
}

export default function Loading({ text = 'Indlæser...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 font-medium">{text}</p>
    </div>
  );
} 