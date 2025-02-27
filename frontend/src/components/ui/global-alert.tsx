import { proxy, useSnapshot } from "valtio";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

interface AlertState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  mode: "confirm" | "info";
}

const alertState = proxy<AlertState>({
  isOpen: false,
  message: "",
  onConfirm: () => {},
  onCancel: () => {},
  mode: "confirm",
});

export const Alert = {
  confirm: (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      alertState.mode = "confirm";
      alertState.isOpen = true;
      alertState.message = message;
      alertState.onConfirm = () => {
        alertState.isOpen = false;
        resolve(true);
      };
      alertState.onCancel = () => {
        alertState.isOpen = false;
        resolve(false);
      };
    });
  },
  info: (message: string): Promise<void> => {
    return new Promise((resolve) => {
      alertState.mode = "info";
      alertState.isOpen = true;
      alertState.message = message;
      alertState.onConfirm = () => {
        alertState.isOpen = false;
        resolve();
      };
      // No cancel for info mode
      alertState.onCancel = () => {};
    });
  },
};

export function GlobalAlert() {
  const snap = useSnapshot(alertState);

  return (
    <AlertDialog open={snap.isOpen}>
      <AlertDialogContent className="select-none">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {snap.mode === "confirm" ? "Konfirmasi" : "Informasi"}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">{snap.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {snap.mode === "confirm" ? (
            <>
              <AlertDialogCancel
                className="cursor-pointer"
                onClick={snap.onCancel}
              >
                Tidak
              </AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer"
                onClick={snap.onConfirm}
              >
                Ya
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction onClick={snap.onConfirm}>OK</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
