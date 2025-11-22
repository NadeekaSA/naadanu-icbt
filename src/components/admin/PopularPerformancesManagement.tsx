import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Heart, Plus, X, AlertCircle, Trash2, Eye, EyeOff, Music, Users as UsersIcon } from 'lucide-react';

interface Participant {
  id: string;
  full_name: string;
  icbt_id: string;
  team_name?: string;
  category: {
    id: string;
    name: string;
  };
}

interface Performance {
  id: string;
  performance_title: string;
  performance_order: number;
  is_active: boolean;
  participant: {
    full_name: string;
    team_name?: string;
    icbt_id: string;
  };
  category: {
    name: string;
    type: string;
  };
  vote_count: number;
  performance_image_url?: string;
}

// New interface for category-wise performance grouping
interface CategoryPerformances {
  category: {
    name: string;
    type: string;
  };
  performances: Performance[];
}

export default function PopularPerformancesManagement() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [categoryPerformances, setCategoryPerformances] = useState<CategoryPerformances[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  const [addForm, setAddForm] = useState({
    participantId: '',
    performanceTitle: '',
    performanceImageUrl: '',
    performanceOrder: 1,
  });

  const [participantSearch, setParticipantSearch] = useState('');
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    fetchPerformances();
    fetchSelectedParticipants();
    checkAndCreateTables();
  }, []);

  const checkAndCreateTables = async () => {
    try {
      // Try to access the final_performances table
      const { data, error } = await supabase
        .from('final_performances')
        .select('id')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        console.log('Tables do not exist, they need to be created via migration');
      }
    } catch (err) {
      console.error('Error checking tables:', err);
    }
  };

  useEffect(() => {
    if (participantSearch) {
      const query = participantSearch.toLowerCase();
      const filtered = selectedParticipants.filter(
        (p) =>
          p.full_name.toLowerCase().includes(query) ||
          p.icbt_id.toLowerCase().includes(query) ||
          p.team_name?.toLowerCase().includes(query)
      );
      setFilteredParticipants(filtered);
    } else {
      setFilteredParticipants(selectedParticipants);
    }
  }, [participantSearch, selectedParticipants]);

  const fetchSelectedParticipants = async () => {
    const { data, error: fetchError } = await supabase
      .from('participants')
      .select(`
        id,
        full_name,
        icbt_id,
        team_name,
        category:categories(id, name)
      `)
      .eq('status', 'selected')
      .order('full_name');

    if (fetchError) {
      console.error('Error fetching selected participants:', fetchError);
      setError(`Failed to load participants: ${fetchError.message || 'Database connection error'}`);
    }

    if (!fetchError && data) {
      setSelectedParticipants(data as any);
    }
  };

  const fetchPerformances = async () => {
    setLoading(true);

    try {
      // Fetch performances with vote counts in a single query using a subquery
      const { data: performanceData, error: perfError } = await supabase
        .from('final_performances')
        .select(`
          id,
          performance_title,
          performance_order,
          is_active,
          performance_image_url,
          participant:participants(full_name, icbt_id, team_name),
          category:categories(name, type, is_group),
          performance_votes(count)
        `)
        .order('performance_order');

      if (perfError) {
        console.error('Error fetching performances:', perfError);
        setError(`Failed to load performances: ${perfError.message}`);
        setLoading(false);
        return;
      }

      if (!performanceData) {
        setPerformances([]);
        setCategoryPerformances([]);
        setLoading(false);
        return;
      }

      // Transform the data to include vote counts
      const performancesWithVotes = (performanceData as any[]).map((perf) => ({
        id: perf.id,
        performance_title: perf.performance_title,
        performance_order: perf.performance_order,
        is_active: perf.is_active,
        performance_image_url: perf.performance_image_url,
        participant: perf.participant,
        category: perf.category,
        // Extract vote count from the count aggregation
        vote_count: perf.performance_votes?.[0]?.count || 0
      }));

      setPerformances(performancesWithVotes);
      
      // Group performances by category for the new feature
      const groupedPerformances: Record<string, CategoryPerformances> = {};
      
      performancesWithVotes.forEach(performance => {
        const categoryName = performance.category.name;
        
        if (!groupedPerformances[categoryName]) {
          groupedPerformances[categoryName] = {
            category: performance.category,
            performances: []
          };
        }
        
        groupedPerformances[categoryName].performances.push(performance);
      });
      
      // Convert to array and sort performances by vote count within each category
      const categoryPerformancesArray = Object.values(groupedPerformances).map(categoryGroup => ({
        ...categoryGroup,
        performances: categoryGroup.performances
          .sort((a, b) => b.vote_count - a.vote_count) // Sort by vote count descending
          .slice(0, 1) // Take only the top performance per category
      }));
      
      setCategoryPerformances(categoryPerformancesArray);
    } catch (err) {
      console.error('Unexpected error fetching performances:', err);
      setError('An unexpected error occurred while loading performances');
    } finally {
      setLoading(false);
    }
  };

  // Alternative method if the above doesn't work - using a separate vote count query
  const fetchVoteCountsSeparately = async (performanceIds: string[]) => {
    if (performanceIds.length === 0) return {};

    const { data: voteData, error } = await supabase
      .from('performance_votes')
      .select('performance_id')
      .in('performance_id', performanceIds);

    if (error) {
      console.error('Error fetching vote counts:', error);
      return {};
    }

    const voteCounts: Record<string, number> = {};
    voteData?.forEach((vote) => {
      voteCounts[vote.performance_id] = (voteCounts[vote.performance_id] || 0) + 1;
    });

    return voteCounts;
  };

  const handleAddPerformance = async () => {
    if (!addForm.participantId || !addForm.performanceTitle) {
      setError('Please fill all required fields');
      return;
    }

    const participant = selectedParticipants.find((p) => p.id === addForm.participantId);
    if (!participant) {
      setError('Selected participant not found');
      return;
    }

    // Log the data we're trying to insert
    console.log('Inserting performance with data:', {
      participant_id: addForm.participantId,
      category_id: participant.category.id,
      performance_title: addForm.performanceTitle,
      performance_image_url: addForm.performanceImageUrl || null,
      performance_order: addForm.performanceOrder,
      is_active: true,
    });

    const { error: insertError, data: insertData } = await supabase.from('final_performances').insert({
      participant_id: addForm.participantId,
      category_id: participant.category.id,
      performance_title: addForm.performanceTitle,
      performance_image_url: addForm.performanceImageUrl || null,
      performance_order: addForm.performanceOrder,
      is_active: true,
    }).select();

    if (insertError) {
      console.error('Error adding performance:', insertError);
      // Provide more specific error messages
      if (insertError.message.includes('referenced')) {
        setError(`Failed to add performance: Referenced participant or category not found`);
      } else if (insertError.message.includes('final_performances')) {
        setError(`Failed to add performance: Database table may not exist. Contact system administrator.`);
      } else {
        setError(`Failed to add performance: ${insertError.message || insertError.details || 'Unknown database error'}`);
      }
    } else {
      console.log('Successfully added performance:', insertData);
      setShowAddModal(false);
      setAddForm({ participantId: '', performanceTitle: '', performanceImageUrl: '', performanceOrder: 1 });
      setParticipantSearch('');
      setError('');
      fetchPerformances();
    }
  };

  const togglePerformanceStatus = async (performanceId: string, currentStatus: boolean) => {
    const { error: updateError } = await supabase
      .from('final_performances')
      .update({ is_active: !currentStatus })
      .eq('id', performanceId);

    if (updateError) {
      console.error('Error updating performance status:', updateError);
      setError(`Failed to update performance status: ${updateError.message || 'Unknown error'}`);
    } else {
      fetchPerformances();
    }
  };

  const handleDeletePerformance = async (performanceId: string) => {
    if (!window.confirm('Are you sure you want to delete this performance? All votes will be removed.')) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('final_performances')
      .delete()
      .eq('id', performanceId);

    if (deleteError) {
      console.error('Error deleting performance:', deleteError);
      setError(`Failed to delete performance: ${deleteError.message || 'Unknown error'}`);
    } else {
      fetchPerformances();
    }
  };

  const getVotingLink = () => {
    return `${window.location.origin}/vote`;
  };

  const copyVotingLink = () => {
    navigator.clipboard.writeText(getVotingLink());
    alert('Voting link copied to clipboard!');
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading performances...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Popular Performances</h2>
          <p className="text-sm text-slate-600 mt-1">Manage final performances and view audience votes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={copyVotingLink}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Heart className="w-5 h-5" />
            Copy Voting Link
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              setError('');
              setAddForm({ participantId: '', performanceTitle: '', performanceImageUrl: '', performanceOrder: performances.length + 1 });
              setParticipantSearch('');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Performance
          </button>
        </div>
      </div>

      {/* New Category-wise Popular Performances Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-900">Most Popular Performances by Category</h3>
        </div>
        
        {categoryPerformances.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No performances available yet
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            {categoryPerformances.map((categoryGroup) => (
              categoryGroup.performances.length > 0 && (
                <div 
                  key={categoryGroup.category.name} 
                  className="flex-1 min-w-[250px] bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-md border border-slate-200 overflow-hidden flex"
                >
                  {categoryGroup.performances[0].performance_image_url && (
                    <div className="w-24 h-24 flex-shrink-0">
                      <img 
                        src={categoryGroup.performances[0].performance_image_url} 
                        alt={categoryGroup.performances[0].performance_title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Handle image loading errors gracefully
                          const target = e.target as HTMLImageElement;
                          target.parentElement!.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                          categoryGroup.category.type === 'singing'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {categoryGroup.category.name}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                          {categoryGroup.performances[0].performance_title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1">
                          {categoryGroup.performances[0].participant.team_name || categoryGroup.performances[0].participant.full_name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-pink-500 fill-current" />
                        <span className="font-bold text-slate-900">
                          {categoryGroup.performances[0].vote_count}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        #{categoryGroup.performances[0].performance_order}
                      </span>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Add Performance to Finals</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
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
                  Select Participant (Selected for Finals) *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search by name, ID, or team..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                    {filteredParticipants.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">
                        No selected participants found
                      </div>
                    ) : (
                      filteredParticipants.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setAddForm({ ...addForm, participantId: p.id })}
                          className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            addForm.participantId === p.id ? 'bg-slate-100' : ''
                          }`}
                        >
                          <p className="font-medium text-slate-900">
                            {p.team_name || p.full_name}
                          </p>
                          <p className="text-sm text-slate-600">
                            {p.icbt_id} • {p.category.name}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {addForm.participantId && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓{' '}
                    {selectedParticipants.find((p) => p.id === addForm.participantId)?.team_name ||
                      selectedParticipants.find((p) => p.id === addForm.participantId)?.full_name}{' '}
                    selected
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Performance Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Melody of Dreams"
                  value={addForm.performanceTitle}
                  onChange={(e) => setAddForm({ ...addForm, performanceTitle: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Performance Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={addForm.performanceImageUrl}
                  onChange={(e) => setAddForm({ ...addForm, performanceImageUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Performance Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={addForm.performanceOrder}
                  onChange={(e) =>
                    setAddForm({ ...addForm, performanceOrder: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPerformance}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Add Performance
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-start gap-3">
          <Trophy className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Public Voting Link</p>
            <p className="text-xs text-slate-600 mt-1">
              Share this link with the audience to vote for their favorite performances
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white rounded border border-slate-200 text-sm text-purple-700">
                {getVotingLink()}
              </code>
              <button
                onClick={copyVotingLink}
                className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {performances.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
          <Trophy className="w-16 h-16 mx-auto mb-3 text-slate-400 opacity-50" />
          <p className="text-lg text-slate-600">No performances added yet</p>
          <p className="text-sm text-slate-500 mt-1">Click "Add Performance" to add finalists</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Votes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {performances
                  .sort((a, b) => a.performance_order - b.performance_order)
                  .map((performance) => (
                    <tr key={performance.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-semibold text-slate-900">
                          #{performance.performance_order}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{performance.performance_title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {performance.participant.team_name || performance.participant.full_name}
                          </p>
                          <p className="text-sm text-slate-500">{performance.participant.icbt_id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {performance.category.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Heart className="w-5 h-5 text-pink-500 fill-current" />
                          <span className="font-bold text-lg text-slate-900">
                            {performance.vote_count}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            performance.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {performance.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              togglePerformanceStatus(performance.id, performance.is_active)
                            }
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title={performance.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {performance.is_active ? (
                              <EyeOff className="w-4 h-4 text-slate-600" />
                            ) : (
                              <Eye className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeletePerformance(performance.id)}
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
        </div>
      )}
    </div>
  );
}
