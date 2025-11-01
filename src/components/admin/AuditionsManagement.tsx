import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Plus, Search, X, Edit, Trash2, AlertCircle } from 'lucide-react';

interface Participant {
  id: string;
  full_name: string;
  email: string;
  icbt_id: string;
  phone_number: string;
  team_name?: string;
  category: {
    id: string;
    name: string;
  };
}

interface Audition {
  id: string;
  participant_id: string;
  scheduled_date: string | null;
  venue: string;
  result: string;
  admin_notes: string;
  participant: {
    full_name: string;
    email: string;
    icbt_id: string;
    team_name?: string;
  };
  category: {
    name: string;
  };
}

export default function AuditionsManagement() {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [filteredAuditions, setFilteredAuditions] = useState<Audition[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    participantId: '',
    date: '',
    time: '',
    venue: '',
  });
  const [participantSearchInput, setParticipantSearchInput] = useState('');
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    venue: '',
    result: '',
    admin_notes: '',
  });

  useEffect(() => {
    fetchAuditions();
    fetchParticipants();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditions, searchQuery, filterStatus]);

  useEffect(() => {
    if (participantSearchInput) {
      const query = participantSearchInput.toLowerCase();
      const filtered = participants.filter(
        (p) =>
          p.full_name.toLowerCase().includes(query) ||
          p.icbt_id.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query)
      );
      setFilteredParticipants(filtered);
    } else {
      setFilteredParticipants(participants);
    }
  }, [participantSearchInput, participants]);

  const fetchAuditions = async () => {
    const { data, error: fetchError } = await supabase
      .from('auditions')
      .select(`
        *,
        participant:participants(full_name, email, icbt_id, phone_number, team_name),
        category:categories(name)
      `)
      .order('scheduled_date', { ascending: false, nullsFirst: true });

    if (!fetchError && data) {
      setAuditions(data as any);
    }
    setLoading(false);
  };

  const fetchParticipants = async () => {
    const { data, error: fetchError } = await supabase
      .from('participants')
      .select(`
        *,
        category:categories(id, name)
      `)
      .order('full_name');

    if (!fetchError && data) {
      setParticipants(data as any);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.participant.full_name.toLowerCase().includes(query) ||
        a.participant.icbt_id.toLowerCase().includes(query) ||
        a.participant.email.toLowerCase().includes(query) ||
        a.category.name.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'unscheduled') {
        filtered = filtered.filter((a) => !a.scheduled_date);
      } else if (filterStatus === 'scheduled') {
        filtered = filtered.filter((a) => a.scheduled_date && a.result === 'pending');
      } else {
        filtered = filtered.filter((a) => a.result === filterStatus);
      }
    }

    setFilteredAuditions(filtered);
  };

  const handleScheduleAudition = async () => {
    if (!scheduleForm.participantId || !scheduleForm.date || !scheduleForm.time || !scheduleForm.venue) {
      setError('Please fill all fields');
      return;
    }

    const participant = participants.find((p) => p.id === scheduleForm.participantId);
    if (!participant) return;

    const scheduledDate = new Date(`${scheduleForm.date}T${scheduleForm.time}`).toISOString();

    const { error: insertError } = await supabase.from('auditions').insert({
      participant_id: scheduleForm.participantId,
      category_id: participant.category.id,
      scheduled_date: scheduledDate,
      venue: scheduleForm.venue,
      result: 'pending',
    });

    if (!insertError) {
      await supabase
        .from('participants')
        .update({ status: 'audition_scheduled' })
        .eq('id', scheduleForm.participantId);

      setShowScheduleModal(false);
      setScheduleForm({ participantId: '', date: '', time: '', venue: '' });
      setParticipantSearchInput('');
      setError('');
      fetchAuditions();
      fetchParticipants();
    } else {
      setError('Failed to schedule audition');
    }
  };

  const startEdit = (audition: Audition) => {
    if (audition.scheduled_date) {
      const date = new Date(audition.scheduled_date);
      setEditForm({
        date: date.toISOString().split('T')[0],
        time: date.toTimeString().slice(0, 5),
        venue: audition.venue,
        result: audition.result,
        admin_notes: audition.admin_notes,
      });
      setEditingId(audition.id);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.date || !editForm.time || !editForm.venue) {
      setError('Please fill all fields');
      return;
    }

    const audition = auditions.find((a) => a.id === editingId);
    if (!audition) return;

    const scheduledDate = new Date(`${editForm.date}T${editForm.time}`).toISOString();

    const { error: updateError } = await supabase
      .from('auditions')
      .update({
        scheduled_date: scheduledDate,
        venue: editForm.venue,
        result: editForm.result,
        admin_notes: editForm.admin_notes,
      })
      .eq('id', editingId);

    if (!updateError) {
      const newStatus =
        editForm.result === 'qualified'
          ? 'selected'
          : editForm.result === 'not_qualified'
          ? 'not_selected'
          : 'audition_scheduled';

      await supabase
        .from('participants')
        .update({ status: newStatus })
        .eq('id', audition.participant_id);

      setEditingId(null);
      setError('');
      fetchAuditions();
    } else {
      setError('Failed to update audition');
    }
  };

  const handleDeleteAudition = async (auditionId: string) => {
    if (!window.confirm('Are you sure you want to delete this audition?')) return;

    const { error: deleteError } = await supabase
      .from('auditions')
      .delete()
      .eq('id', auditionId);

    if (!deleteError) {
      fetchAuditions();
    } else {
      setError('Failed to delete audition');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading auditions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-900">Audition Management</h2>
        <button
          onClick={() => {
            setShowScheduleModal(true);
            setError('');
            setScheduleForm({ participantId: '', date: '', time: '', venue: '' });
            setParticipantSearchInput('');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Schedule Audition
        </button>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Schedule Audition</h3>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setError('');
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Select Participant *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search by name, ID, or email..."
                    value={participantSearchInput}
                    onChange={(e) => setParticipantSearchInput(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                    {filteredParticipants.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">No participants found</div>
                    ) : (
                      filteredParticipants.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setScheduleForm({ ...scheduleForm, participantId: p.id })}
                          className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            scheduleForm.participantId === p.id ? 'bg-slate-100' : ''
                          }`}
                        >
                          <p className="font-medium text-slate-900">{p.full_name}</p>
                          <p className="text-sm text-slate-600">{p.icbt_id} • {p.category.name}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {scheduleForm.participantId && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {participants.find((p) => p.id === scheduleForm.participantId)?.full_name} selected
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Venue *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Room 101"
                    value={scheduleForm.venue}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleAudition}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Edit Audition</h3>
              <button
                onClick={() => {
                  setEditingId(null);
                  setError('');
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Venue *
                  </label>
                  <input
                    type="text"
                    value={editForm.venue}
                    onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Result
                  </label>
                  <select
                    value={editForm.result}
                    onChange={(e) => setEditForm({ ...editForm, result: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="pending">Not Evaluated</option>
                    <option value="qualified">Qualified</option>
                    <option value="not_qualified">Not Qualified</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={editForm.admin_notes}
                  onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                  placeholder="Add notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setEditingId(null);
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, ID, email, or category..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="all">All Auditions</option>
              <option value="unscheduled">Not Scheduled</option>
              <option value="scheduled">Scheduled (Pending)</option>
              <option value="pending">Not Evaluated</option>
              <option value="qualified">Qualified</option>
              <option value="not_qualified">Not Qualified</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {filteredAuditions.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Calendar className="w-16 h-16 mx-auto mb-3 text-slate-400 opacity-50" />
            <p className="text-lg">No auditions found</p>
            <p className="text-sm mt-1">
              {auditions.length === 0
                ? 'Click "Schedule Audition" to add one'
                : 'Try adjusting your search or filter'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Result
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAuditions.map((audition) => (
                  <tr key={audition.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{audition.participant.full_name}</p>
                        <p className="text-sm text-slate-500">{audition.participant.icbt_id}</p>
                        {audition.participant.team_name && (
                          <p className="text-xs text-slate-400">{audition.participant.team_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {audition.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {audition.scheduled_date ? (
                        <div className="text-sm">
                          <p className="font-medium text-slate-900">
                            {new Date(audition.scheduled_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-slate-500">
                            {new Date(audition.scheduled_date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{audition.venue || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          audition.result === 'qualified'
                            ? 'bg-green-100 text-green-800'
                            : audition.result === 'not_qualified'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {audition.result === 'qualified'
                          ? 'Qualified'
                          : audition.result === 'not_qualified'
                          ? 'Not Qualified'
                          : 'Not Evaluated'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(audition)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteAudition(audition.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredAuditions.length > 0 && (
        <div className="text-sm text-slate-600">
          Showing {filteredAuditions.length} of {auditions.length} auditions
        </div>
      )}
    </div>
  );
}
