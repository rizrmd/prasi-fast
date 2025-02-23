import { useRef, useState } from "react";

export const useLocal = <T extends Record<string, any>>(value: T) => {
  const local = useRef(value).current;
  const render = useState({})[1];
  (local as any).render = () => render({});
  return local as T & { render: () => void };
};
