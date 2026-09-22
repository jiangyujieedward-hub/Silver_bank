'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';

import './Dock.css';

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize, label, active, inline }) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  const scale = useTransform(size, latest => latest / baseItemSize);
  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.button
      type="button"
      ref={ref}
      style={{
        width: inline ? undefined : size,
        height: inline ? undefined : size,
        scale: inline ? scale : undefined
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      {Children.map(children, child => cloneElement(child, { isHovered }))}
    </motion.button>
  );
}

function DockLabel({ children, className = '', ...rest }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '' }) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

/** @param {{items:any[],[key:string]:any}} props */
export default function Dock({
  items,
  inline = false,
  label = 'Application dock',
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50
}) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  );
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div style={{ height: inline ? "auto" : height, scrollbarWidth: 'none' }} className={`dock-outer ${inline ? "dock-inline" : ""}`}>
      <motion.div
        onMouseMove={({ clientX }) => {
          isHovered.set(1);
          mouseX.set(clientX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={`dock-panel ${className}`}
        style={{ height: inline ? "auto" : panelHeight }}
        role="group"
        aria-label={label}
      >
        {items.map((item, index) => (
          <DockItem
            inline={inline}
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            label={item.label}
            active={item.active}
          >
            <DockIcon><span>{item.icon}</span><span className="dock-item-text">{item.label}</span></DockIcon>

          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}
