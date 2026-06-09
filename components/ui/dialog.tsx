import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-lg">
        <div className="bg-background border border-border rounded-lg shadow-lg">
          {children}
        </div>
      </div>
    </>
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
}

export const DialogContent = ({ children, onOpenChange }: DialogContentProps) => (
  <div className="relative">
    <button
      onClick={() => onOpenChange(false)}
      className="absolute right-4 top-4 p-1 hover:bg-accent rounded"
    >
      <X className="h-4 w-4" />
    </button>
    <div className="p-6">{children}</div>
  </div>
);

export const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 pr-8">{children}</div>
);

export const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold">{children}</h2>
);

export const DialogDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground mt-2">{children}</p>
);
