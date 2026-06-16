import { useEffect, useState } from "react";

function detectCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** True on touch-first devices (session table mobile mode). */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(detectCoarsePointer);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return coarse;
}
