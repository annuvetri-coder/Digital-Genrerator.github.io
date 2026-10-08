import React from 'react';
import { OFFICIAL_LOGO_TRANSPARENT_DATA_URL } from '../assets/logo';

interface CompanyLogoProps {
  className?: string;
  size?: number | string;
  showBorder?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 40,
  showBorder = true,
}) => {
  const dimensionStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  return (
    <div
      style={dimensionStyle}
      className={`relative inline-flex items-center justify-center flex-shrink-0 bg-white rounded-lg select-none overflow-hidden ${
        showBorder ? 'border-2 border-black shadow-xs' : ''
      } ${className}`}
      title="ITS YOUR TURN Official Logo"
    >
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full p-0.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="30"
          y="30"
          width="440"
          height="440"
          fill="none"
          stroke="#000000"
          strokeWidth="32"
        />
        <g
          fill="#000000"
          fontFamily="'Arial Black', 'Inter', 'Helvetica Neue', sans-serif"
          fontWeight="900"
          textAnchor="middle"
        >
          <text x="250" y="195" fontSize="152" letterSpacing="10">
            ITS
          </text>
          <text x="250" y="302" fontSize="112" letterSpacing="4">
            YOUR
          </text>
          <text x="250" y="402" fontSize="118" letterSpacing="6">
            TURN
          </text>
        </g>
      </svg>
    </div>
  );
};
