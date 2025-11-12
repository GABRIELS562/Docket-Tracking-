import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card = ({
  children,
  className = '',
  padding = 'md',
  hover = false
}: CardProps) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverClasses = hover ? 'hover:shadow-lg hover:scale-[1.02] transition-all' : '';

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 ${paddingClasses[padding]} ${hoverClasses} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
