import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Plus } from 'lucide-react';

interface Participant {
  id: string;
  full_name: string;
  email: string;
  icbt_id: string;
  team_name?: string;
  category: {
    id: string;
    name: string;
  };
}

interface Audition {
  id: string;
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
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    venue: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditions();
    fetchParticipants();
  }, []);

  const fetchAuditions = async () => {
    const { data, error } = await supabase
      .from('auditions')
      .select(`
        *,
        participant:participants(full_name, email, icbt_id, team_name),
        category:categories(name)
      `)
      .order('scheduled_date', { ascending: true });

    if (!error && data) {
      setAuditions(data as any);
    }
    setLoading(false);
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('participants')
      .select(`
        *,
        category:categories(id, name)
      `)
      .in('status', ['pending', 'audition_scheduled']);

    if (!error && data) {
      setParticipants(data as any);
    }
  };

  const scheduleAudition = async () => {
    if (!selectedParticipant || !scheduleData.date || !scheduleData.time || !scheduleData.venue) {
      alert('Please fill all fields');
      return;
    }

    const participant = participants.find((p) => p.id === selectedParticipant);
    if (!participant) return;

    const scheduledDate = new Date(`${scheduleData.date}T${scheduleData.time}`).toISOString();

    const { error: auditionError } = await supabase.from('auditions').insert({
      participant_id: selectedParticipant,
      category_id: participant.category.id,
      scheduled_date: scheduledDate,
      venue: scheduleData.venue,
      result: 'pending',
    });

    if (!auditionError) {
      await supabase
        .from('participants')
        .update({ status: 'audition_scheduled' })
        .eq('id', selectedParticipant);

      setShowScheduleModal(false);
      setSelectedParticipant('');
      setScheduleData({ date: '', time: '', venue: '' });
      fetchAuditions();
      fetchParticipants();
    }
  };

  const updateAuditionResult = async (auditionId: string, result: string, participantId: string) => {
    const { error } = await supabase
      .from('auditions')
      .update({
        result,
        updated_at: new Date().toISOString()
      })
      .eq('id', auditionId);

    if (!error) {
      const newStatus = result === 'qualified' ? 'selected' : 'not_selected';
      await supabase
        .from('participants')
        .update({ status: newStatus })
        .eq('id', participantId);

      fetchAuditions();
    }
  };

  const updateAdminNotes = async (auditionId: string, notes: string) => {
    await supabase
      .from('auditions')
      .update({
        admin_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', auditionId);
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading auditions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-900">Audition Management</h2>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Schedule Audition
        </button>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Schedule Audition</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Participant
                </label>
                <select
                  value={selectedParticipant}
                  onChange={(e) => setSelectedParticipant(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">Choose participant...</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} - {p.icbt_id} ({p.category.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Venue</label>
                <input
                  type="text"
                  value={scheduleData.venue}
                  onChange={(e) => setScheduleData({ ...scheduleData, venue: e.target.value })}
                  placeholder="e.g., Main Auditorium"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={scheduleAudition}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {auditions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No auditions scheduled yet. Click "Schedule Audition" to get started.
          </div>
        ) : (
          auditions.map((audition) => (
            <div
              key={audition.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {audition.participant.full_name}
                        {audition.participant.team_name && (
                          <span className="text-slate-500 font-normal ml-2">
                            ({audition.participant.team_name})
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-600">{audition.participant.icbt_id}</p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                      {audition.category.name}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {audition.scheduled_date && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(audition.scheduled_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                    {audition.scheduled_date && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        {new Date(audition.scheduled_date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                    {audition.venue && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        {audition.venue}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      value={audition.admin_notes}
                      onChange={(e) => updateAdminNotes(audition.id, e.target.value)}
                      placeholder="Add notes or feedback..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="lg:w-48">
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Result
                  </label>
                  <select
                    value={audition.result}
                    onChange={(e) =>
                      updateAuditionResult(audition.id, e.target.value, audition.participant_id)
                    }
                    className={`w-full px-3 py-2 rounded-lg border-2 font-medium transition-colors ${
                      audition.result === 'qualified'
                        ? 'border-green-500 bg-green-50 text-green-900'
                        : audition.result === 'not_qualified'
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="qualified">Qualified</option>
                    <option value="not_qualified">Not Qualified</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
