import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, Music, Users as UsersIcon, Trophy, CheckCircle, AlertCircle } from 'lucide-react';

interface Performance {
  id: string;
  performance_title: string;
  performance_image_url?: string;
  performance_order: number;
  participant_name: string;
  team_name?: string;
  category_name: string;
  category_type: string;
  is_group: boolean;
  vote_count: number;
  has_voted: boolean;
}

export default function VotingPage() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformances();
  }, []);

  const fetchPerformances = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting to fetch performances...');

      // Let's try the most direct approach - use the view you created
      const { data: performanceData, error: performanceError } = await supabase
        .from('performance_vote_counts')
        .select('*')
        .eq('is_active', true)
        .order('performance_order');

      console.log('📊 Performance vote counts data:', performanceData);

      if (performanceError) {
        console.error('❌ Error fetching from view:', performanceError);
        // Fallback to direct table query
        await fetchFromTablesDirectly();
        return;
      }

      if (!performanceData || performanceData.length === 0) {
        console.log('📭 No performances found');
        setPerformances([]);
        setLoading(false);
        return;
      }

      // Now we need to get participant and category names
      const performancesWithNames = await enrichWithParticipantAndCategoryNames(performanceData);
      
      // Check which performances current user has voted for
      const votedPerformances = getVotedPerformances();

      const finalPerformances = performancesWithNames.map((perf) => ({
        ...perf,
        has_voted: votedPerformances.includes(perf.id),
      }));

      console.log('🎯 Final performances:', finalPerformances);
      setPerformances(finalPerformances);

    } catch (err) {
      console.error('💥 Unexpected error:', err);
      setError('An unexpected error occurred while loading performances.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromTablesDirectly = async () => {
    try {
      console.log('🔄 Trying direct table fetch...');
      
      // Get performances with all related data in one query using proper joins
      const { data: performanceData, error } = await supabase
        .from('final_performances')
        .select(`
          *,
          participants (
            full_name,
            team_name
          ),
          categories (
            name,
            type,
            is_group
          )
        `)
        .eq('is_active', true)
        .order('performance_order');

      console.log('📋 Direct query results:', performanceData);
      
      if (error) {
        console.error('❌ Direct query error:', error);
        throw error;
      }

      if (!performanceData || performanceData.length === 0) {
        setPerformances([]);
        return;
      }

      // Transform the data
      const transformedPerformances = performanceData.map(perf => {
        console.log('🔍 Processing performance:', {
          id: perf.id,
          title: perf.performance_title,
          participant: perf.participants,
          category: perf.categories
        });

        return {
          id: perf.id,
          performance_title: perf.performance_title,
          performance_image_url: perf.performance_image_url,
          performance_order: perf.performance_order,
          participant_name: perf.participants?.full_name || 'No Name Found',
          team_name: perf.participants?.team_name,
          category_name: perf.categories?.name || 'No Category',
          category_type: perf.categories?.type || 'other',
          is_group: perf.categories?.is_group || false,
          vote_count: 0, // We'll update this next
        };
      });

      // Get vote counts
      const { data: voteData } = await supabase
        .from('performance_votes')
        .select('performance_id');

      const voteCounts: Record<string, number> = {};
      voteData?.forEach((vote) => {
        voteCounts[vote.performance_id] = (voteCounts[vote.performance_id] || 0) + 1;
      });

      const votedPerformances = getVotedPerformances();

      const finalPerformances = transformedPerformances.map((perf) => ({
        ...perf,
        vote_count: voteCounts[perf.id] || 0,
        has_voted: votedPerformances.includes(perf.id),
      }));

      setPerformances(finalPerformances);

    } catch (error) {
      console.error('❌ Error in direct fetch:', error);
      throw error;
    }
  };

  const enrichWithParticipantAndCategoryNames = async (performances: any[]) => {
    console.log('🎭 Enriching performances with names...');
    
    const performancesWithNames: Performance[] = [];

    for (const perf of performances) {
      try {
        // Get participant name
        const { data: participantData } = await supabase
          .from('participants')
          .select('full_name, team_name')
          .eq('id', perf.participant_id)
          .single();

        console.log(`👤 Participant data for ${perf.participant_id}:`, participantData);

        // Get category info
        const { data: categoryData } = await supabase
          .from('categories')
          .select('name, type, is_group')
          .eq('id', perf.category_id)
          .single();

        console.log(`🎪 Category data for ${perf.category_id}:`, categoryData);

        performancesWithNames.push({
          id: perf.id,
          performance_title: perf.performance_title,
          performance_image_url: perf.performance_image_url,
          performance_order: perf.performance_order,
          participant_name: participantData?.full_name || `Participant ${perf.participant_id?.substring(0, 8)}`,
          team_name: participantData?.team_name,
          category_name: categoryData?.name || 'General',
          category_type: categoryData?.type || 'other',
          is_group: categoryData?.is_group || false,
          vote_count: perf.vote_count || 0,
          has_voted: false
        });

      } catch (error) {
        console.error(`❌ Error enriching performance ${perf.id}:`, error);
        // Add with fallback data
        performancesWithNames.push({
          id: perf.id,
          performance_title: perf.performance_title,
          performance_image_url: perf.performance_image_url,
          performance_order: perf.performance_order,
          participant_name: `Participant ${perf.participant_id?.substring(0, 8) || 'Unknown'}`,
          team_name: undefined,
          category_name: 'General',
          category_type: 'other',
          is_group: false,
          vote_count: perf.vote_count || 0,
          has_voted: false
        });
      }
    }

    return performancesWithNames;
  };

  const getVotedPerformances = (): string[] => {
    try {
      const voted = localStorage.getItem('voted_performances');
      return voted ? JSON.parse(voted) : [];
    } catch (error) {
      return [];
    }
  };

  const markAsVoted = (performanceId: string) => {
    try {
      const voted = getVotedPerformances();
      if (!voted.includes(performanceId)) {
        voted.push(performanceId);
        localStorage.setItem('voted_performances', JSON.stringify(voted));
      }
    } catch (error) {
      console.error('Error saving vote:', error);
    }
  };

  const handleVote = async (performanceId: string) => {
    const votedPerformances = getVotedPerformances();
    if (votedPerformances.includes(performanceId)) {
      setMessage({ type: 'error', text: 'You have already voted for this performance!' });
      return;
    }

    setVotingFor(performanceId);
    setMessage(null);

    try {
      const voterIP = getVoterIdentifier();

      const { error } = await supabase.from('performance_votes').insert({
        performance_id: performanceId,
        voter_ip: voterIP,
        voter_fingerprint: navigator.userAgent,
      });

      if (error) {
        console.error('Vote error:', error);
        if (error.code === '23505') {
          setMessage({ type: 'error', text: 'You have already voted for this performance!' });
          markAsVoted(performanceId);
        } else {
          setMessage({ type: 'error', text: 'Failed to submit vote. Please try again.' });
        }
      } else {
        markAsVoted(performanceId);
        setMessage({ type: 'success', text: 'Thank you! Your vote has been recorded.' });
        fetchPerformances();
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      setMessage({ type: 'error', text: 'An unexpected error occurred while voting.' });
    } finally {
      setVotingFor(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const getVoterIdentifier = (): string => {
    try {
      let identifier = localStorage.getItem('voter_id');
      if (!identifier) {
        identifier = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('voter_id', identifier);
      }
      return identifier;
    } catch (error) {
      return `fallback_voter_${Date.now()}`;
    }
  };

  const categories = [...new Set(performances.map((p) => p.category_name).filter(Boolean))];
  const filteredPerformances =
    categoryFilter === 'all'
      ? performances
      : performances.filter((p) => p.category_name === categoryFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-slate-600 text-lg">Loading performances...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Performances</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchPerformances}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="w-10 h-10 text-purple-600" />
              <h1 className="text-3xl font-bold text-slate-900">නාදනූ 2.0 Finals</h1>
            </div>
            <p className="text-slate-600 text-lg">Vote for Your Favorite Performance</p>
            <p className="text-sm text-slate-500 mt-1">Support your favorite performers by giving them a like!</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {categories.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                categoryFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  categoryFilter === cat
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {filteredPerformances.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-16 h-16 mx-auto mb-4 text-slate-400 opacity-50" />
            <p className="text-xl text-slate-600">
              {performances.length === 0 
                ? 'No performances available for voting yet.' 
                : 'No performances found in this category.'}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {performances.length === 0 ? 'Check back soon!' : 'Try selecting a different category.'}
            </p>
            {performances.length === 0 && (
              <button
                onClick={fetchPerformances}
                className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Refresh
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {filteredPerformances.map((performance) => (
              <div
                key={performance.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow border border-slate-200 overflow-hidden"
              >
                {performance.performance_image_url && (
                  <div className="w-full h-48 overflow-hidden bg-slate-100">
                    <img 
                      src={performance.performance_image_url} 
                      alt={performance.performance_title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${
                          performance.category_type === 'singing'
                            ? 'bg-purple-100 text-purple-800'
                            : performance.category_type === 'dancing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {performance.is_group ? <UsersIcon className="w-3 h-3 mr-1" /> : null}
                        {performance.category_name}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {performance.performance_title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {performance.team_name || performance.participant_name}
                      </p>
                    </div>
                  </div>
                
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Heart className="w-5 h-5 text-pink-500" />
                      <span className="font-semibold text-lg">{performance.vote_count}</span>
                      <span className="text-sm text-slate-500">
                        {performance.vote_count === 1 ? 'like' : 'likes'}
                      </span>
                    </div> 
                              
                    <button
                      onClick={() => handleVote(performance.id)}
                      disabled={performance.has_voted || votingFor === performance.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        performance.has_voted
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : votingFor === performance.id
                          ? 'bg-slate-200 text-slate-500 cursor-wait'
                          : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-md hover:shadow-lg'
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          performance.has_voted ? 'fill-current' : ''
                        }`}
                      />
                      {performance.has_voted
                        ? 'Voted'
                        : votingFor === performance.id
                        ? 'Voting...'
                        : 'Vote'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-slate-600">
          <p>© 2025 Computing Society of ICBT - නාදනූ 2.0</p>
          <p className="mt-1 text-xs text-slate-500">Vote for your favorite performances and support the talent!</p>
        </div>
      </footer>
    </div>
  );
}
