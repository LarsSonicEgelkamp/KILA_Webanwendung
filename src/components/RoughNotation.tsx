import React from 'react';
import { annotate } from 'rough-notation';

type RoughNotationProps = {
  type: 'underline' | 'box' | 'circle' | 'highlight' | 'strike-through' | 'bracket' | 'crossed-off';
  show?: boolean;
  color?: string;
  strokeWidth?: number;
  padding?: number | [number, number, number, number];
  animate?: boolean;
  animationDuration?: number;
  iterations?: number;
  multiline?: boolean;
  children: React.ReactNode;
};

const RoughNotation: React.FC<RoughNotationProps> = ({
  type,
  show = false,
  color,
  strokeWidth,
  padding,
  animate,
  animationDuration,
  iterations,
  multiline,
  children
}) => {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const annotationRef = React.useRef<{ show: () => void; remove: () => void } | null>(null);

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }
    annotationRef.current?.remove?.();
    if (!show) {
      return;
    }
    const annotation = annotate(ref.current, {
      type,
      color,
      strokeWidth,
      padding,
      animate,
      animationDuration,
      iterations,
      multiline
    });
    annotation.show();
    annotationRef.current = annotation;
    return () => annotation.remove?.();
  }, [type, show, color, strokeWidth, padding, animate, animationDuration, iterations, multiline]);

  return <span ref={ref}>{children}</span>;
};

export default RoughNotation;
