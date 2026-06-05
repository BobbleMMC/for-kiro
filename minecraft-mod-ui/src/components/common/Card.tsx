import type { FC, ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

const Card: FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  hoverable = false,
  onClick,
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 ${
        hoverable ? 'hover:shadow-lg transition-shadow cursor-pointer' : 'shadow'
      } ${className}`}
      onClick={onClick}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
