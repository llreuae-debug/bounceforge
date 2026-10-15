import React from 'react';
import { LogoConcept, LogoVariant, BRAND_COLORS, getSymbolSVG } from './svgStrings';

export interface LogoProps {
  concept?: LogoConcept;
  variant?: LogoVariant;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  sm: { width: 140, height: 35 },
  md: { width: 220, height: 55 },
  lg: { width: 320, height: 80 },
  xl: { width: 440, height: 110 },
};

const SYMBOL_SIZE_MAP: Record<string, { width: number; height: number }> = {
  sm: { width: 32, height: 32 },
  md: { width: 48, height: 48 },
  lg: { width: 72, height: 72 },
  xl: { width: 96, height: 96 },
};

const STACKED_SIZE_MAP: Record<string, { width: number; height: number }> = {
  sm: { width: 110, height: 67 },
  md: { width: 160, height: 98 },
  lg: { width: 240, height: 146 },
  xl: { width: 340, height: 208 },
};

export const Logo: React.FC<LogoProps> = ({
  concept = 'a',
  variant = 'horizontal',
  size = 'md',
  color,
  animated = true,
  className = '',
  onClick,
  style,
}) => {
  const isMonoWhite = variant === 'mono-white';
  const isMonoBlack = variant === 'mono-black';
  const isSymbolOnly = variant === 'symbol';
  const isStacked = variant === 'stacked';

  const monoType = isMonoWhite ? 'white' : isMonoBlack ? 'black' : undefined;

  let dims: { width: number; height: number };
  if (typeof size === 'number') {
    if (isSymbolOnly) {
      dims = { width: size, height: size };
    } else if (isStacked) {
      dims = { width: size, height: Math.round(size * (220 / 360)) };
    } else {
      dims = { width: size, height: Math.round(size * (120 / 480)) };
    }
  } else {
    if (isSymbolOnly) {
      dims = SYMBOL_SIZE_MAP[size] || SYMBOL_SIZE_MAP.md;
    } else if (isStacked) {
      dims = STACKED_SIZE_MAP[size] || STACKED_SIZE_MAP.md;
    } else {
      dims = SIZE_MAP[size] || SIZE_MAP.md;
    }
  }

  const textColor = color
    ? color
    : isMonoWhite
    ? '#FFFFFF'
    : isMonoBlack
    ? '#000000'
    : BRAND_COLORS.white;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        lineHeight: 0,
        ...style,
      }}
      className={`group select-none ${className}`}
      role="img"
      aria-label={`BounceForge Logo (${concept.toUpperCase()})`}
    >
      <style>{`
        @keyframes bfFlatPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .bf-flat-logo:hover .symbol-concept-a {
          animation: bfFlatPulse 1.2s ease-in-out infinite;
          transform-origin: 60px 60px;
        }
      `}</style>

      {isSymbolOnly ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 120"
          width={dims.width}
          height={dims.height}
          className={animated ? 'bf-flat-logo transition-transform duration-200' : ''}
          dangerouslySetInnerHTML={{ __html: getSymbolSVG(concept, monoType) }}
        />
      ) : isStacked ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 360 220"
          width={dims.width}
          height={dims.height}
          className={animated ? 'bf-flat-logo' : ''}
        >
          {/* Symbol Centered on Top */}
          <g transform="translate(120, 10)" dangerouslySetInnerHTML={{ __html: getSymbolSVG(concept, monoType) }} />
          {/* Wordmark Centered Below */}
          <text
            x="180"
            y="180"
            fontFamily="'Helvetica Neue', Helvetica, -apple-system, sans-serif"
            fontSize="44"
            fontWeight="900"
            letterSpacing="-0.05em"
            textAnchor="middle"
            fill={textColor}
          >
            bounceforge
          </text>
        </svg>
      ) : (
        /* Horizontal Lockup: Flat Symbol + bounceforge */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 480 120"
          width={dims.width}
          height={dims.height}
          className={animated ? 'bf-flat-logo' : ''}
        >
          {/* Symbol at left */}
          <g transform="translate(4, 0)" dangerouslySetInnerHTML={{ __html: getSymbolSVG(concept, monoType) }} />

          {/* Wordmark */}
          <text
            x="132"
            y="74"
            fontFamily="'Helvetica Neue', Helvetica, -apple-system, sans-serif"
            fontSize="52"
            fontWeight="900"
            letterSpacing="-0.05em"
            fill={textColor}
          >
            bounceforge
          </text>
        </svg>
      )}
    </div>
  );
};
export default Logo;
