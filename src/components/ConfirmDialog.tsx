import { ReactNode } from 'react';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';

export function ConfirmDialog({
  title,
  description,
  open,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive,
  body,
}: {
  title: string;
  description?: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  body?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      }
    >
      {body}
    </Modal>
  );
}
