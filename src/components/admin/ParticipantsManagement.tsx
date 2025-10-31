import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter } from 'lucide-react';

interface Participant {
  id: string;
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

export default function ParticipantsManagement() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipants();
  }, []);

  useEffect(() => {
    filterParticipants();
  }, [searchTerm, categoryFilter, statusFilter, participants]);

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('participants')
      .select(`
        *,
        category:categories(name)
      `)
      .order('registration_date', { ascending: false });

    if (!error && data) {
      setParticipants(data as any);
    }
    setLoading(false);
  };

  const filterParticipants = () => {
    let filtered = [...participants];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.icbt_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category.name === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredParticipants(filtered);
  };

  const updateParticipantStatus = async (participantId: string, newStatus: string) => {
    const { error } = await supabase
      .from('participants')
      .update({ status: newStatus })
      .eq('id', participantId);

    if (!error) {
      fetchParticipants();
    }
  };

  const categories = [...new Set(participants.map((p) => p.category.name))];

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading participants...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or ICBT ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="audition_scheduled">Audition Scheduled</option>
            <option value="selected">Selected</option>
            <option value="not_selected">Not Selected</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Filter className="w-4 h-4" />
          Showing {filteredParticipants.length} of {participants.length} participants
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Participant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                ICBT ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Team Info
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredParticipants.map((participant) => (
              <tr key={participant.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium text-slate-900">{participant.full_name}</div>
                    <div className="text-sm text-slate-500">{participant.email}</div>
                    <div className="text-sm text-slate-500">{participant.phone_number}</div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-900">{participant.icbt_id}</td>
                <td className="px-4 py-4 text-sm text-slate-900">{participant.category.name}</td>
                <td className="px-4 py-4 text-sm text-slate-900">
                  {participant.team_name ? (
                    <div>
                      <div className="font-medium">{participant.team_name}</div>
                      <div className="text-slate-500">{participant.team_size} members</div>
                    </div>
                  ) : (
                    <span className="text-slate-400">Solo</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      participant.status === 'selected'
                        ? 'bg-green-100 text-green-800'
                        : participant.status === 'not_selected'
                        ? 'bg-red-100 text-red-800'
                        : participant.status === 'audition_scheduled'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {participant.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <select
                    value={participant.status}
                    onChange={(e) => updateParticipantStatus(participant.id, e.target.value)}
                    className="text-sm px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="audition_scheduled">Audition Scheduled</option>
                    <option value="selected">Selected</option>
                    <option value="not_selected">Not Selected</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
