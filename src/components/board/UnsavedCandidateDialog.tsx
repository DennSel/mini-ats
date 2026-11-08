import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Check, Trash2 } from "lucide-react";

export function UnsavedCandidateDialog({
  open,
  onOpenChange,
  onSave,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl border-border bg-surface sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Vill du spara dina ändringar?</AlertDialogTitle>
          <AlertDialogDescription>
            Du har osparade ändringar i kandidatkortet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onDiscard}>
            <Trash2 /> Släng
          </Button>
          <Button variant="gradient" onClick={onSave}>
            <Check /> Spara
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
