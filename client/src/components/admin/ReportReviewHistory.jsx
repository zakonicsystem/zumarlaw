export const reportReviewStatus = report => report.reviewStatus || (report.reviewedAt ? 'approved' : 'pending');
export const reportStatusLabels = { pending: 'Pending review', objected: 'Objection raised', resubmitted: 'Resubmitted', approved: 'Approved' };
export default function ReportReviewHistory({ report }) {
  return <section className="space-y-4">
    {reportReviewStatus(report) === 'objected' && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><h3 className="font-semibold text-red-800">Correction required</h3><p className="mt-2 text-sm whitespace-pre-wrap break-words text-red-700">{report.objectionRemark || report.remark}</p></div>}
    {report.correctionRemark && <div className="bg-blue-50 rounded-lg p-4"><h3 className="font-semibold text-blue-800">Employee correction note</h3><p className="mt-2 text-sm whitespace-pre-wrap break-words">{report.correctionRemark}</p></div>}
    {!!report.reviewHistory?.length && <div><h3 className="font-semibold">Review & correction history</h3><ol className="mt-3 space-y-3">{report.reviewHistory.map((event, i) => <li key={event._id || i} className="border-l-2 border-purple-200 pl-4"><p className="text-sm font-semibold text-[#57123f]">{reportStatusLabels[event.action] || event.action} · {event.actorName || 'Staff'}</p><p className="text-xs text-gray-500 mt-1">{new Date(event.at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</p><p className="text-sm mt-2 whitespace-pre-wrap break-words">{event.remark}</p></li>)}</ol></div>}
  </section>;
}
