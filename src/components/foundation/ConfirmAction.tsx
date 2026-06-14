/**
 * ConfirmAction — opinionated wrapper around shadcn's AlertDialog.
 *
 * Three pages (Users, ApiKeys, Webhooks) re-implemented the same
 * "are you sure?" dialog by hand, each with slightly different copy
 * for the buttons, different danger-color treatment, and different
 * async-handling. This collapses them into one shape:
 *
 *   const [open, setOpen] = useState(false);
 *   <ConfirmAction
 *     open={open} onOpenChange={setOpen}
 *     variant="destructive"
 *     title="¿Eliminar este usuario?"
 *     description={<><b>{user.username}</b> perderá su acceso.</>}
 *     confirmLabel="Eliminar"
 *     onConfirm={() => api.removeUser(user.id)}    // can return a Promise
 *   />
 *
 * What it handles consistently:
 *   - variant=destructive paints the confirm button red (vs blue
 *     for the neutral default), and adds a triangle icon next to
 *     the title. Most-used variant by far; making it explicit
 *     prevents "soft delete styled like a primary action".
 *   - variant=warning for irreversible-but-not-destructive actions
 *     (rotate API key, force-resync source, mark case closed).
 *   - When onConfirm returns a Promise, the confirm button shows a
 *     spinner and blocks dismissal until the promise settles. Pages
 *     no longer have to thread isLoading through their dialog props.
 *   - Errors thrown by onConfirm stay inside the dialog: the spinner
 *     stops, the dialog stays open, the caller's toast (or whatever)
 *     handles the user-facing message. Closing on success only.
 */
import { useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export type ConfirmVariant = 'destructive' | 'warning' | 'neutral';

interface ConfirmActionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: ConfirmVariant;
  title: string;
  /** Body of the dialog. Pass a string for plain copy or JSX when you
   *  need to bold a name / interpolate values. */
  description: ReactNode;
  /** Label for the confirm button. Defaults to a verb matching the
   *  variant ("Eliminar" / "Continuar" / "Confirmar"). */
  confirmLabel?: string;
  /** Label for the cancel button. */
  cancelLabel?: string;
  /** Called when the user clicks confirm. If this returns a Promise,
   *  the dialog blocks dismissal and shows a spinner until it settles.
   *  Throwing keeps the dialog open. */
  onConfirm: () => void | Promise<void>;
}

const VARIANT_CLASSES: Record<ConfirmVariant, { confirm: string; icon: ReactNode | null }> = {
  destructive: {
    confirm: 'bg-red-600 hover:bg-red-500 text-white',
    icon: <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />,
  },
  warning: {
    confirm: 'bg-amber-600 hover:bg-amber-500 text-white',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  },
  neutral: {
    confirm: 'bg-electric-500 hover:bg-electric-400 text-navy-900',
    icon: null,
  },
};

const DEFAULT_CONFIRM_LABEL: Record<ConfirmVariant, string> = {
  destructive: 'Eliminar',
  warning: 'Continuar',
  neutral: 'Confirmar',
};

export function ConfirmAction({
  open,
  onOpenChange,
  variant = 'destructive',
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
}: ConfirmActionProps) {
  const [busy, setBusy] = useState(false);
  const v = VARIANT_CLASSES[variant];
  const label = confirmLabel ?? DEFAULT_CONFIRM_LABEL[variant];

  const handleConfirm = async () => {
    setBusy(true);
    try {
      // Await even if onConfirm is sync — `Promise.resolve(undefined)`
      // is cheap and keeps the success path uniform.
      await Promise.resolve(onConfirm());
      onOpenChange(false);
    } catch {
      // Caller's responsibility to surface a toast/message. We just
      // keep the dialog open so they can retry without re-opening it.
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        // Don't let the user dismiss mid-flight — they'd see the action
        // resolve while the dialog is gone, which feels broken.
        if (!busy) onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {v.icon}
            <span>{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              // Prevent the default radix-dialog close — we control it
              // ourselves so async failures keep the dialog open.
              e.preventDefault();
              void handleConfirm();
            }}
            className={cn('inline-flex items-center gap-2', v.confirm)}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
