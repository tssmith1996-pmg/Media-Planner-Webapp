import { useEffect, useState } from 'react';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { Select } from '@/ui/Select';
import { channelEnum, type Channel } from '@/lib/schemas';

export function AddChannelDialog({
  open,
  busy,
  onClose,
  onAdd,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onAdd: (channel: Channel) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<Channel>(channelEnum.options[0]);

  useEffect(() => {
    if (open) {
      setSelected(channelEnum.options[0]);
    }
  }, [open]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a channel"
      description="Create a new channel row and scaffold the required flighting details."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              void onAdd(selected);
            }}
          >
            Add channel
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Channels determine the fields shown in the line item form and the columns rendered in the flighting table.
        </p>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Channel</span>
          <Select value={selected} onChange={(event) => setSelected(event.currentTarget.value as Channel)}>
            {channelEnum.options.map((channel) => (
              <option key={channel} value={channel}>
                {channel.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </label>
        <p className="text-xs text-slate-500">
          Channel-specific extension fields will be pre-filled with placeholder values so planners can refine them later.
        </p>
      </div>
    </Modal>
  );
}
