import { Input } from "@/components/ui/input";
import { ModelToolbar } from "../toolbar";

export const ModelFilter = () => {
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
