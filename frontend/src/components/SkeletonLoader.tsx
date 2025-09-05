import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'table-row' | 'text' | 'circle' | 'rectangle';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangle',
  width = 'w-full',
  height = 'h-4',
  className = '',
  count = 1
}) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return 'rounded-xl p-6 h-32';
      case 'table-row':
        return 'rounded-lg h-16';
      case 'text':
        return 'rounded h-4';
      case 'circle':
        return 'rounded-full';
      case 'rectangle':
      default:
        return 'rounded-lg';
    }
  };

  const skeletonElement = (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${width} ${height} ${className}`}
    />
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="mb-4 last:mb-0">
          {skeletonElement}
        </div>
      ))}
    </>
  );
};

// Specific skeleton components for different use cases
export const CertificateCardSkeleton: React.FC = () => (
  <div className="card-elevated animate-fade-in">
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <SkeletonLoader variant="circle" width="w-10" height="h-10" />
          <div className="space-y-2">
            <SkeletonLoader variant="text" width="w-32" height="h-5" />
            <SkeletonLoader variant="text" width="w-24" height="h-3" />
          </div>
        </div>
        <SkeletonLoader variant="rectangle" width="w-20" height="h-6" className="rounded-full" />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <SkeletonLoader variant="text" width="w-20" height="h-4" />
          <SkeletonLoader variant="text" width="w-16" height="h-4" />
        </div>
        <div className="flex justify-between">
          <SkeletonLoader variant="text" width="w-24" height="h-4" />
          <SkeletonLoader variant="text" width="w-20" height="h-4" />
        </div>
        <div className="flex justify-between">
          <SkeletonLoader variant="text" width="w-28" height="h-4" />
          <SkeletonLoader variant="text" width="w-24" height="h-4" />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-4">
        <SkeletonLoader variant="rectangle" width="w-8" height="h-8" className="rounded-lg" />
        <SkeletonLoader variant="rectangle" width="w-8" height="h-8" className="rounded-lg" />
        <SkeletonLoader variant="rectangle" width="w-8" height="h-8" className="rounded-lg" />
      </div>
    </div>
  </div>
);

export const CertificateTableRowSkeleton: React.FC = () => (
  <tr className="border-b border-gray-200 dark:border-gray-700 animate-fade-in">
    <td className="px-6 py-4">
      <SkeletonLoader variant="circle" width="w-5" height="h-5" />
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center space-x-3">
        <SkeletonLoader variant="circle" width="w-8" height="h-8" />
        <div className="space-y-1">
          <SkeletonLoader variant="text" width="w-24" height="h-4" />
          <SkeletonLoader variant="text" width="w-16" height="h-3" />
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-1">
        <SkeletonLoader variant="text" width="w-20" height="h-4" />
        <SkeletonLoader variant="text" width="w-16" height="h-3" />
      </div>
    </td>
    <td className="px-6 py-4">
      <SkeletonLoader variant="text" width="w-18" height="h-4" />
    </td>
    <td className="px-6 py-4">
      <SkeletonLoader variant="rectangle" width="w-16" height="h-6" className="rounded-full" />
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center space-x-1">
        <SkeletonLoader variant="circle" width="w-4" height="h-4" />
        <SkeletonLoader variant="text" width="w-8" height="h-4" />
      </div>
    </td>
    <td className="px-6 py-4">
      <SkeletonLoader variant="text" width="w-20" height="h-4" />
    </td>
    <td className="px-6 py-4">
      <div className="flex space-x-2">
        <SkeletonLoader variant="rectangle" width="w-8" height="h-8" className="rounded-lg" />
        <SkeletonLoader variant="rectangle" width="w-8" height="h-8" className="rounded-lg" />
        <SkeletonLoader variant="rectangle" width="w-8" height="h-8" className="rounded-lg" />
      </div>
    </td>
  </tr>
);

export const FiltersSkeleton: React.FC = () => (
  <div className="card-glass animate-slide-up mb-6">
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <SkeletonLoader variant="rectangle" width="w-full" height="h-10" className="rounded-lg" />
        <SkeletonLoader variant="rectangle" width="w-full" height="h-10" className="rounded-lg" />
        <SkeletonLoader variant="rectangle" width="w-full" height="h-10" className="rounded-lg" />
        <SkeletonLoader variant="rectangle" width="w-full" height="h-10" className="rounded-lg" />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <SkeletonLoader variant="rectangle" width="w-24" height="h-8" className="rounded-lg" />
          <SkeletonLoader variant="rectangle" width="w-20" height="h-8" className="rounded-lg" />
        </div>
        <SkeletonLoader variant="rectangle" width="w-32" height="h-10" className="rounded-lg" />
      </div>
    </div>
  </div>
);

export default SkeletonLoader;