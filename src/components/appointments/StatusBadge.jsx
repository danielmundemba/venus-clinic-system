import React from 'react';

const statusConfig = {
  pending: {
    label: 'Pending',
    bgClass: 'bg-venus-warning/15',
    textClass: 'text-venus-warning',
    dotClass: 'bg-venus-warning',
    borderClass: 'border-venus-warning/30'
  },
  'checked-in': {
    label: 'Checked In',
    bgClass: 'bg-venus-primary-500/15',
    textClass: 'text-venus-primary-400',
    dotClass: 'bg-venus-primary-400',
    borderClass: 'border-venus-primary-400/30'
  },
  'in-progress': {
    label: 'In Progress',
    bgClass: 'bg-venus-info/15',
    textClass: 'text-venus-info',
    dotClass: 'bg-venus-info',
    borderClass: 'border-venus-info/30'
  },
  completed: {
    label: 'Completed',
    bgClass: 'bg-venus-success/15',
    textClass: 'text-venus-success',
    dotClass: 'bg-venus-success',
    borderClass: 'border-venus-success/30'
  },
  cancelled: {
    label: 'Cancelled',
    bgClass: 'bg-venus-danger/15',
    textClass: 'text-venus-danger',
    dotClass: 'bg-venus-danger',
    borderClass: 'border-venus-danger/30'
  }
};

const StatusBadge = ({ status, size = 'md', showDot = true, className = '' }) => {
  const config = statusConfig[status] || statusConfig.pending;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${config.bgClass} ${config.textClass} ${config.borderClass}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showDot && (
        <span className={`w-2 h-2 rounded-full ${config.dotClass} ${status === 'in-progress' ? 'animate-pulse' : ''}`} />
      )}
      {config.label}
    </span>
  );
};

export default StatusBadge;