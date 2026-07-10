import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className={`${sizes[size]} text-emerald-500 animate-spin`} />
      {text && <p className="mt-3 text-sm text-gray-400">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
