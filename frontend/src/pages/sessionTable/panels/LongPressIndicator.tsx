interface LongPressIndicatorProps {
  clientX: number;
  clientY: number;
}

export function LongPressIndicator({ clientX, clientY }: LongPressIndicatorProps) {
  return (
    <div
      className="st-long-press-ring"
      style={{ left: clientX, top: clientY }}
      aria-hidden
    />
  );
}
