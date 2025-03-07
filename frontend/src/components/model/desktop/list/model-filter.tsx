import { Input } from "@/components/ui/input";
import { ModelToolbar } from "../toolbar";
import { useEffect } from "react";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { useSnapshot } from "valtio";

export const ModelFilter = () => {
  const { state } = useValtioTab();
  const reader = useSnapshot(state);
  
  useEffect(() => {}, [reader.list.filter]);

  return (
    <ModelToolbar
      left={
        <>
          <Input type="search" placeholder="Search" />
        </>
      }
    />
  );
};
