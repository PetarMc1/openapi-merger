import { memo } from 'react';

type LoadingSkeletonProps = {
  rows?: number;
};

function LoadingSkeletonContent({ rows = 6 }: LoadingSkeletonProps) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-line" />
      ))}
    </div>
  );
}

export const LoadingSkeleton = memo(LoadingSkeletonContent);
