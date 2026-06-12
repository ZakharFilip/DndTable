import { useEffect, useState } from "react";

function detectCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  return coarse || narrow;
}

/** True on touch-first devices or narrow viewports (session table mobile mode). */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(detectCoarsePointer);

  useEffect(() => {
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const mqNarrow = window.matchMedia("(max-width: 768px)");
    const update = () => setCoarse(mqCoarse.matches || mqNarrow.matches);
    update();
    mqCoarse.addEventListener("change", update);
    mqNarrow.addEventListener("change", update);
    return () => {
      mqCoarse.removeEventListener("change", update);
      mqNarrow.removeEventListener("change", update);
    };
  }, []);

  return coarse;
}
