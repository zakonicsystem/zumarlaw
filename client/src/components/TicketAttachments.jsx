import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
export default function TicketAttachments({ ticket, url, onClose }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const files = ticket.attachments || [];
  async function download(file) {
    setBusy(true);
    try {
      const route = file ? `${url}/${ticket._id}/attachments/${file._id}` : `${url}/${ticket._id}/attachments`;
      const response = await axios.get(route, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data); const link = document.createElement('a');
      link.href = objectUrl; link.download = file ? file.originalName : `${ticket.reference}-attachments.zip`;
      link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch { toast.error('Could not download attachments. Please try again.'); } finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="ticket-attachments-title" onClose={onClose} className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] rounded-2xl p-0 shadow-2xl backdrop:bg-black/50">
    <div className="p-6 space-y-5"><header className="flex items-start justify-between gap-4"><div><p className="text-xs text-gray-500">{ticket.reference}</p><h2 id="ticket-attachments-title" className="text-xl font-semibold text-[#57123f] mt-1">Attachments ({files.length})</h2><p className="mt-1 text-sm text-gray-500">{ticket.subject}</p></div><button type="button" aria-label="Close attachments" className="border rounded-lg px-3 py-1" onClick={() => dialog.current?.close()}>×</button></header>
      {!files.length ? <p className="py-8 text-center text-gray-500">No attachments on this ticket.</p> : <><div className="flex flex-wrap justify-between items-center gap-3"><p className="text-sm text-gray-500">All supporting files for this ticket</p><button disabled={busy} className="bg-[#57123f] text-white px-4 py-2 rounded-lg disabled:opacity-50" onClick={() => download()}>{busy ? 'Preparing download…' : 'Download all (ZIP)'}</button></div>
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">{files.map((file, index) => <li key={file._id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="text-sm font-medium break-all">{index + 1}. {file.originalName}</p><p className="text-xs text-gray-500 mt-1">{file.mimetype || 'Document'} · {Math.ceil((file.size || 0) / 1024)} KB</p></div><button disabled={busy} className="shrink-0 text-sm font-semibold text-[#57123f] underline disabled:opacity-50" onClick={() => download(file)}>Download</button></li>)}</ul></>}
      <footer className="border-t border-gray-200 pt-4"><button className="border rounded-lg px-4 py-2" onClick={() => dialog.current?.close()}>Close</button></footer>
    </div>
  </dialog>;
}
