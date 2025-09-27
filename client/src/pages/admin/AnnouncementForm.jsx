import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AnnouncementForm = () => {
  const [heading, setHeading] = useState('');
  const [paragraph, setParagraph] = useState('');
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editHeading, setEditHeading] = useState('');
  const [editParagraph, setEditParagraph] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('https://app.zumarlawfirm.com/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      toast.error('Failed to fetch announcements');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('https://app.zumarlawfirm.com/announcements', { heading, paragraph });
      setHeading('');
      setParagraph('');
      fetchAnnouncements();
      toast.success('Announcement added successfully');
    } catch (err) {
      toast.error('Failed to add announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://app.zumarlawfirm.com/announcements/${id}`);
      fetchAnnouncements();
      toast.success('Announcement deleted');
    } catch (err) {
      toast.error('Failed to delete announcement');
    }
  };

  const handleEdit = (announcement) => {
    setEditId(announcement._id);
    setEditHeading(announcement.heading);
    setEditParagraph(announcement.paragraph);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`https://app.zumarlawfirm.com/announcements/${editId}`, { heading: editHeading, paragraph: editParagraph });
      setEditId(null);
      setEditHeading('');
      setEditParagraph('');
      fetchAnnouncements();
      toast.success('Announcement updated');
    } catch (err) {
      toast.error('Failed to update announcement');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form className="bg-white p-6 rounded-xl shadow-md mb-6" onSubmit={handleSubmit}>
        <h2 className="text-xl font-semibold mb-4">Add Announcement</h2>
        <input
          type="text"
          placeholder="Heading"
          className="w-full mb-3 px-4 py-2 border rounded"
          value={heading}
          onChange={e => setHeading(e.target.value)}
          required
        />
        <textarea
          placeholder="Paragraph"
          className="w-full mb-3 px-4 py-2 border rounded"
          value={paragraph}
          onChange={e => setParagraph(e.target.value)}
          required
          rows={4}
        />
  {/* Toast notifications will show errors and success messages */}
        <button type="submit" className="bg-[#57123f] text-white px-6 py-2 rounded hover:bg-[#6d2c5b]" disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>

      <h2 className="text-lg font-bold mb-2">Announcements</h2>
      <table className="w-full text-sm border rounded mb-8">
        <thead>
          <tr className="bg-[#f3e8ff] text-[#57123f]">
            <th className="p-2 text-left">Heading</th>
            <th className="p-2 text-left">Paragraph</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map(a => (
            <tr key={a._id} className="border-b">
              <td className="p-2">{editId === a._id ? (
                <input value={editHeading} onChange={e => setEditHeading(e.target.value)} className="border rounded px-2 py-1 w-full" />
              ) : a.heading}</td>
              <td className="p-2">{editId === a._id ? (
                <textarea value={editParagraph} onChange={e => setEditParagraph(e.target.value)} className="border rounded px-2 py-1 w-full" rows={2} />
              ) : a.paragraph}</td>
              <td className="p-2">
                {editId === a._id ? (
                  <>
                    <button className="bg-green-600 text-white px-2 py-1 rounded mr-2" onClick={handleUpdate}>Save</button>
                    <button className="bg-gray-400 text-white px-2 py-1 rounded" onClick={() => setEditId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="bg-blue-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleEdit(a)}>Edit</button>
                    <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete(a._id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnnouncementForm;
