'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ColorScheme {
  name: string;
  colors: string[];
}

interface ScrollGradientBackgroundProps {
  colorSchemes?: ColorScheme[];
  animationSpeed?: number;
  blur?: 'light' | 'medium' | 'heavy';
  size?: string;
  blendingValue?: string;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
}

const defaultColorSchemes: ColorScheme[] = [
  {
    name: 'orange',
    colors: ['#FF6B35', '#F7931E', '#FFA500'],
  },
  {
    name: 'green',
    colors: ['#00E676', '#4CAF50', '#8BC34A'],
  },
  {
    name: 'pink',
    colors: ['#FF80AB', '#F06292', '#EC4899'],
  },
  {
    name: 'yellow',
    colors: ['#FFD600', '#FFC107', '#FFEB3B'],
  },
  {
    name: 'gold',
    colors: ['#FFD700', '#FFA500', '#FF8C00'],
  },
  {
    name: 'silver',
    colors: ['#C0C0C0', '#A8A8A8', '#D3D3D3'],
  },
];

export const ScrollGradientBackground: React.FC<ScrollGradientBackgroundProps> = ({
  colorSchemes = defaultColorSchemes,
  animationSpeed = 0.05,
  blur = 'medium',
  size = '80%',
  blendingValue = 'hard-light',
  className = '',
  containerClassName = '',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const circleSize = Math.max(dimensions.width, dimensions.height);

  const blurClass =
    blur === 'light'
      ? 'blur-2xl'
      : blur === 'medium'
      ? 'blur-3xl'
      : 'blur-[100px]';

  const currentSchemeIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, colorSchemes.length - 1]
  );

  const [activeColors, setActiveColors] = useState(colorSchemes[0].colors);

  useEffect(() => {
    const unsubscribe = currentSchemeIndex.on('change', (latest) => {
      const index = Math.round(latest);
      const clampedIndex = Math.max(0, Math.min(index, colorSchemes.length - 1));
      setActiveColors(colorSchemes[clampedIndex].colors);
    });

    return () => unsubscribe();
  }, [currentSchemeIndex, colorSchemes]);

  useEffect(() => {
    document.body.style.setProperty('--size', size);
    document.body.style.setProperty('--blending-value', blendingValue);
  }, [size, blendingValue]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 overflow-hidden bg-background',
        containerClassName
      )}
    >
      <div className={cn('absolute inset-0', blurClass)}>
        {activeColors.map((color, index) => (
          <motion.svg
            key={`${color}-${index}`}
            className="absolute"
            style={{
              top: `${(index * 30) % 70}%`,
              left: `${(index * 40) % 60}%`,
              mixBlendMode: blendingValue as React.CSSProperties['mixBlendMode'],
            }}
            animate={{
              x: [0, 100, -50, 0],
              y: [0, -80, 100, 0],
              scale: [1, 1.2, 0.9, 1],
            }}
            transition={{
              duration: 20 / animationSpeed,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 2,
            }}
            width={circleSize * (0.5 + index * 0.2)}
            height={circleSize * (0.5 + index * 0.2)}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="50"
              fill={color}
              className="opacity-30 dark:opacity-[0.15]"
            />
          </motion.svg>
        ))}
      </div>
      <div className={cn('relative z-10', className)}>{children}</div>
    </div>
  );
};

// Compact header-only version
interface HeaderGradientProps {
  colors?: string[];
  animationSpeed?: number;
  blur?: 'light' | 'medium' | 'heavy';
  className?: string;
}

export const HeaderGradient: React.FC<HeaderGradientProps> = ({
  colors = ['#ff6a1a', '#F7931E', '#ea580c'],
  animationSpeed = 0.03,
  blur = 'heavy',
  className = '',
}) => {
  const blurClass =
    blur === 'light'
      ? 'blur-2xl'
      : blur === 'medium'
      ? 'blur-3xl'
      : 'blur-[80px]';

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      <div className={cn('absolute inset-0', blurClass)}>
        {colors.map((color, index) => (
          <motion.div
            key={`header-grad-${index}`}
            className="absolute rounded-full"
            style={{
              background: color,
              width: `${150 + index * 50}px`,
              height: `${150 + index * 50}px`,
              top: `${-30 + index * 10}%`,
              left: `${10 + index * 30}%`,
              opacity: 0.2,
            }}
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -20, 30, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{
              duration: 15 / animationSpeed,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 1.5,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ScrollGradientBackground;
