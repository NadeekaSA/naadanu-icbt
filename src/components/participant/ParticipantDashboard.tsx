import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Calendar, Award, Megaphone, User } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface ParticipantData {
  full_name: string;
  email: string;
  icbt_id: string;
  phone_number: string;
  team_name?: string;
  team_size?: number;
  status: string;
  registration_date: string;
  category: {
    name: string;
  };
}

interface Audition {
  id: string;
  scheduled_date: string | null;
  venue: string;
  result: string;
  admin_notes: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function ParticipantDashboard() {
  const { user, signOut } = useAuth();
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [audition, setAudition] = useState<Audition | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchParticipantData();
      fetchAudition();
      fetchAnnouncements();
      requestNotificationPermission();
    }
  }, [user]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const fetchParticipantData = async () => {
    const { data, error } = await supabase
      .from('participants')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('id', user?.id)
      .maybeSingle();

    if (!error && data) {
      setParticipantData(data as any);
    }
    setLoading(false);
  };

  const fetchAudition = async () => {
    const { data, error } = await supabase
      .from('auditions')
      .select('*')
      .eq('participant_id', user?.id)
      .maybeSingle();

    if (!error && data) {
      setAudition(data);
    }
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setAnnouncements(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-slate-100 text-slate-800', text: 'Pending' },
      audition_scheduled: { color: 'bg-blue-100 text-blue-800', text: 'Audition Scheduled' },
      selected: { color: 'bg-green-100 text-green-800', text: 'Selected for Finals' },
      not_selected: { color: 'bg-red-100 text-red-800', text: 'Not Selected' },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const statusBadge = participantData ? getStatusBadge(participantData.status) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
  src="/nadanu.png"
  alt="නාදනූ Logo"
  className="w-24 h-24 invert"
/>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">නාදනූ 2.0</h1>
                <p className="text-sm text-slate-600 mt-1">Participant Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {participantData && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {participantData.full_name}
                      </h2>
                      <p className="text-sm text-slate-600">{participantData.icbt_id}</p>
                    </div>
                  </div>
                  {statusBadge && (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}
                    >
                      {statusBadge.text}
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Category</p>
                    <p className="font-medium text-slate-900">{participantData.category.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Email</p>
                    <p className="font-medium text-slate-900">{participantData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Phone</p>
                    <p className="font-medium text-slate-900">{participantData.phone_number}</p>
                  </div>
                  {participantData.team_name && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Team</p>
                      <p className="font-medium text-slate-900">
                        {participantData.team_name} ({participantData.team_size} members)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {audition && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-6 h-6 text-slate-900" />
                  <h2 className="text-xl font-bold text-slate-900">Audition Details</h2>
                </div>

                {audition.scheduled_date ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Date & Time</p>
                      <p className="font-medium text-slate-900">
                        {new Date(audition.scheduled_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-slate-700">
                        {new Date(audition.scheduled_date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {audition.venue && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Venue</p>
                        <p className="font-medium text-slate-900">{audition.venue}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Eligibility for Finals</p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          audition.result === 'qualified'
                            ? 'bg-green-100 text-green-800'
                            : audition.result === 'not_qualified'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {audition.result === 'qualified'
                          ? 'Qualified for Finals'
                          : audition.result === 'not_qualified'
                          ? 'Not Qualified'
                          : 'Result Pending'}
                      </span>
                    </div>

                    {audition.admin_notes && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Feedback</p>
                        <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">
                          {audition.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p>Your audition schedule will be announced soon.</p>
                    <p className="text-sm mt-1">Please check back later or watch for announcements.</p>
                  </div>
                )}
              </div>
            )}

            {!audition && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-6 h-6 text-slate-900" />
                  <h2 className="text-xl font-bold text-slate-900">Audition Details</h2>
                </div>
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p>Your audition has not been scheduled yet.</p>
                  <p className="text-sm mt-1">Please check back later or watch for announcements.</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Megaphone className="w-6 h-6 text-slate-900" />
                <h2 className="text-xl font-bold text-slate-900">Announcements</h2>
              </div>

              <div className="space-y-4">
                {announcements.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm">No announcements yet</p>
                  </div>
                ) : (
                  announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="pb-4 border-b border-slate-200 last:border-0 last:pb-0"
                    >
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
