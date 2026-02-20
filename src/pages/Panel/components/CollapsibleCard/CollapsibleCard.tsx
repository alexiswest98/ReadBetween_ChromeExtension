import React, { useState } from 'react';
import './CollapsibleCard.css';

interface Props {
  id?: string;
  title: string;
  titleClassName?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'dark';
}

const ChevronDown: React.FC = () => (
  <svg
    className="collapsible-chevron-svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 14 18 9" />
    <polyline points="6 15 12 20 18 15" />
  </svg>
);

const CollapsibleCard: React.FC<Props> = ({
  id,
  title,
  titleClassName = 'section-title',
  children,
  defaultOpen = true,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isDark = variant === 'dark';
  const cardClasses = [
    'card',
    isDark ? 'collapsible-dark' : '',
    isDark && isOpen ? 'collapsible-dark-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div id={id} className={cardClasses}>
      <button
        className="collapsible-header"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <h2 className={titleClassName}>{title}</h2>
        <span className={`collapsible-chevron${isOpen ? '' : ' collapsed'}`}>
          <ChevronDown />
        </span>
      </button>
      <div className={`collapsible-content${isOpen ? ' open' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleCard;
