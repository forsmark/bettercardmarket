import { useEffect, useState } from "react";
import {
  loadPocket,
  type PocketEntry,
  subscribeToPocket,
} from "../shared/pocket";

/** The pocket entries, kept current while the popup is open. */
export const usePocket = (): PocketEntry[] | null => {
  const [pocket, setPocket] = useState<PocketEntry[] | null>(null);
  useEffect(() => {
    let active = true;
    void loadPocket().then((value) => {
      if (active) setPocket(value);
    });
    const unsubscribe = subscribeToPocket(setPocket);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return pocket;
};
