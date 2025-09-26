import { useState } from 'react';
import type { Plan } from '@/lib/schemas';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { blockPlanTemplates } from '@/exporters/blockPlan/templates';
import { buildPdf } from '@/exporters/blockPlan/pdf';
import { buildExcelWorkbook } from '@/exporters/blockPlan/excel';
import { exportFilename } from '@/exporters/blockPlan/common';

function downloadBlob(filename: string, blob: Blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

export function ExportDialog({ plan, open, onClose }: { plan: Plan; open: boolean; onClose: () => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof blockPlanTemplates)[number]>(
    blockPlanTemplates[0],
  );
  const [busy, setBusy] = useState(false);

  const handleExport = async (type: 'pdf' | 'xlsx') => {
    try {
      setBusy(true);
      if (type === 'pdf') {
        const blob = await buildPdf(plan);
        downloadBlob(exportFilename(plan, 'pdf'), blob);
      } else {
        const blob = await buildExcelWorkbook(plan);
        downloadBlob(exportFilename(plan, 'xlsx'), blob);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Block Plan"
      description="Choose a template and format to export the latest plan."
      footer={
        <div className="flex justify-between gap-2">
          <div className="text-xs text-slate-500">Template: {selectedTemplate.name}</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button disabled={busy} onClick={() => handleExport('pdf')}>
              Export PDF
            </Button>
            <Button disabled={busy} variant="secondary" onClick={() => handleExport('xlsx')}>
              Export XLSX
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Plan exports include status, approver, pacing warnings, and a block plan matrix. Draft plans include a watermark.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {blockPlanTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedTemplate(template)}
              className={`rounded-lg border p-3 text-left text-sm shadow-sm transition hover:border-indigo-400 ${selectedTemplate.id === template.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="font-semibold text-slate-700">{template.name}</div>
              <div className="mt-1 text-xs text-slate-500">{template.description}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
