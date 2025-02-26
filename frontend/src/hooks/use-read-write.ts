import { useRef } from "react";
import { proxy, useSnapshot } from "valtio";

export const useWriter = <T extends Record<string, any>>(initial: T) => {
  const write = useRef(proxy(initial)).current;
  return write;
};

export const useReader = useSnapshot;
