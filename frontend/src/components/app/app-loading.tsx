import { Spinner } from "../ui/spinner";
import { Logo } from "./logo";

export const AppLoading = () => {
  return (
    <div className="flex-1 flex items-center justify-center flex-col w-full h-full space-y-[8px] opacity-70 py-[40px]">
      <Logo small />
      <div className="border-t border-t-slate-300 w-[140px]"></div>
      <div className="flex items-center text-sm space-x-1">
        <Spinner className="w-[17px] h-[17px] opacity-50" />
        <div>Memuat...</div>
      </div>
    </div>
  );
};
