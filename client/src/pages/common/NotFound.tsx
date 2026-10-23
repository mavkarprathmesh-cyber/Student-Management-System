import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
        <ShieldAlert className="w-8 h-8 text-indigo-500" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2">
        The requested institutional module or URL could not be found. Please check your navigation link.
      </p>
      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={() => navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>
          Go Back
        </Button>
        <Button variant="primary" onClick={() => navigate('/dashboard')} icon={<Home className="w-4 h-4" />}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};
