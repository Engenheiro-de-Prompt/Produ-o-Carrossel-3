
import React from 'react';

interface LoadingPageProps {
  message: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping"></div>
        <div className="relative inline-flex rounded-full h-20 w-20 bg-indigo-500"></div>
      </div>
      <h2 className="mt-8 text-2xl font-bold text-slate-800">Criando Magia...</h2>
      <p className="mt-2 text-slate-600 animate-pulse">{message}</p>
    </div>
  );
};