import { GalleryVerticalEnd } from "lucide-react";
import { FC } from "react";

export const Logo: FC<{ text?: boolean; small?: boolean }> = ({
  text,
  small,
}) => {
  if (small) {
    return (
      <a href="#" className="flex items-center gap-[6px] font-medium text-xs">
        <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-2" />
        </div>

        {text !== false && <div>Logify Klinik</div>}
      </a>
    );
  }
  return (
    <a href="#" className="flex items-center gap-2 font-medium">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <GalleryVerticalEnd className="size-4" />
      </div>
      {text !== false && <>Logify Klinik</>}
    </a>
  );
};
