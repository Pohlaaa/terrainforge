import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  rounded = '6px',
  className = '',
}) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{ width, height, borderRadius: rounded }}
    aria-hidden="true"
  />
);

export const SkeletonKPI: React.FC = () => (
  <div
    style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: '10px',
      padding: '16px',
    }}
  >
    <Skeleton width="80px" height="10px" className="mb-[10px]" />
    <Skeleton width="60px" height="28px" />
    <Skeleton width="100px" height="10px" className="mt-[6px]" />
  </div>
);

export const SkeletonWidget: React.FC = () => (
  <div
    style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: '10px',
      padding: '16px',
    }}
  >
    <Skeleton width="140px" height="14px" className="mb-[16px]" />
    <div className="space-y-[8px]">
      <Skeleton height="40px" />
      <Skeleton height="40px" />
      <Skeleton height="40px" />
    </div>
  </div>
);

export default Skeleton;
