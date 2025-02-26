import { Spinner } from "../ui/spinner";
import { Logo } from "./logo";

export const AppLoading = () => {
  return (
    <div className="flex-1 flex items-center justify-center flex-col w-full h-full space-y-[5px] opacity-70">
      <div className="flex items-center">
        <Spinner className="w-[30px] h-[30px] opacity-50" />
        {/* <div className="flex ml-1">Loading...</div> */}
      </div>
      <Logo />
    </div>
  );
};
