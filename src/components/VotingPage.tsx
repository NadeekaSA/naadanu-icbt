import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, Music, Users as UsersIcon, Trophy, CheckCircle, AlertCircle } from 'lucide-react';

interface Performance {
  id: string;
  performance_title: string;
  performance_image_url?: string;
  performance_order: number;
  participant: {
    full_name: string;
    team_name?: string;
  } | null;
  category: {
    name: string;
    type: string;
    is_group: boolean;
  } | null;
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
    console.log('Fetching performances...');

    try {
      // Option 1: Try with proper nested select
      const { data: performanceData, error, status } = await supabase
        .from('final_performances')
        .select(`
          id,
          performance_title,
          performance_image_url,
          performance_order,
          participants!inner(full_name, team_name),
          categories!inner(name, type, is_group)
        `)
        .eq('is_active', true)
        .order('performance_order');

      console.log('Supabase response status:', status);
      console.log('Performance data:', performanceData);
      console.log('Error:', error);

      // If Option 1 fails, try alternative query approaches
      if (error || !performanceData) {
        console.log('Trying alternative query...');
        
        // Option 2: Try simpler query first
        const { data: simpleData, error: simpleError } = await supabase
          .from('final_performances')
          .select('*')
          .eq('is_active', true)
          .order('performance_order');

        console.log('Simple query data:', simpleData);
        
        if (simpleError) {
          console.error('Simple query error:', simpleError);
          setError(`Database error: ${simpleError.message}`);
          setLoading(false);
          return;
        }

        if (!simpleData || simpleData.length === 0) {
          console.log('No performances found in database');
          setPerformances([]);
          setLoading(false);
          return;
        }

        // If we have data but no participant info, we need to fetch it separately
        const performancesWithDetails = await fetchParticipantDetails(simpleData);
        setPerformances(performancesWithDetails);
        setLoading(false);
        return;
      }

      // Transform the data from Option 1 to match our interface
      const transformedData = performanceData.map((perf: any) => ({
        id: perf.id,
        performance_title: perf.performance_title,
        performance_image_url: perf.performance_image_url,
        performance_order: perf.performance_order,
        participant: perf.participants ? {
          full_name: perf.participants.full_name,
          team_name: perf.participants.team_name
        } : null,
        category: perf.categories ? {
          name: perf.categories.name,
          type: perf.categories.type,
          is_group: perf.categories.is_group
        } : null,
        vote_count: 0, // Will be updated below
        has_voted: false // Will be updated below
      }));

      // Fetch vote counts for each performance
      const { data: voteData, error: voteError } = await supabase
        .from('performance_votes')
        .select('performance_id');

      console.log('Vote data:', voteData);
      console.log('Vote error:', voteError);

      // Count votes per performance
      const voteCounts: Record<string, number> = {};
      voteData?.forEach((vote) => {
        voteCounts[vote.performance_id] = (voteCounts[vote.performance_id] || 0) + 1;
      });

      // Check which performances current user has voted for
      const votedPerformances = getVotedPerformances();
      console.log('Voted performances from localStorage:', votedPerformances);

      const performancesWithVotes = transformedData.map((perf) => ({
        ...perf,
        vote_count: voteCounts[perf.id] || 0,
        has_voted: votedPerformances.includes(perf.id),
      }));

      console.log('Final performances with votes:', performancesWithVotes);
      setPerformances(performancesWithVotes);
    } catch (err) {
      console.error('Unexpected error in fetchPerformances:', err);
      setError('An unexpected error occurred while loading performances.');
    } finally {
      setLoading(false);
    }
  };

  // Alternative method to fetch participant details separately
  const fetchParticipantDetails = async (performances: any[]) => {
    try {
      // Get all participant IDs from performances
      const participantIds = performances.map(p => p.participant_id).filter(Boolean);
      const categoryIds = performances.map(p => p.category_id).filter(Boolean);

      // Fetch participants
      const { data: participantsData } = participantIds.length > 0 
        ? await supabase
            .from('participants')
            .select('id, full_name, team_name')
            .in('id', participantIds)
        : { data: [] };

      // Fetch categories
      const { data: categoriesData } = categoryIds.length > 0
        ? await supabase
            .from('categories')
            .select('id, name, type, is_group')
            .in('id', categoryIds)
        : { data: [] };

      console.log('Participants data:', participantsData);
      console.log('Categories data:', categoriesData);

      // Create lookup objects
      const participantsMap: Record<string, any> = {};
      participantsData?.forEach(p => {
        participantsMap[p.id] = p;
      });

      const categoriesMap: Record<string, any> = {};
      categoriesData?.forEach(c => {
        categoriesMap[c.id] = c;
      });

      // Combine data
      return performances.map(perf => ({
        id: perf.id,
        performance_title: perf.performance_title,
        performance_image_url: perf.performance_image_url,
        performance_order: perf.performance_order,
        participant: perf.participant_id && participantsMap[perf.participant_id] 
          ? {
              full_name: participantsMap[perf.participant_id].full_name,
              team_name: participantsMap[perf.participant_id].team_name
            }
          : null,
        category: perf.category_id && categoriesMap[perf.category_id]
          ? {
              name: categoriesMap[perf.category_id].name,
              type: categoriesMap[perf.category_id].type,
              is_group: categoriesMap[perf.category_id].is_group
            }
          : null,
        vote_count: 0,
        has_voted: false
      }));
    } catch (error) {
      console.error('Error fetching participant details:', error);
      return performances.map(perf => ({
        ...perf,
        participant: null,
        category: null
      }));
    }
  };

  const getVotedPerformances = (): string[] => {
    try {
      const voted = localStorage.getItem('voted_performances');
      return voted ? JSON.parse(voted) : [];
    } catch (error) {
      console.error('Error reading voted performances from localStorage:', error);
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
      console.error('Error saving vote to localStorage:', error);
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
        if (error.message.includes('duplicate') || error.code === '23505') {
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
      console.error('Error generating voter identifier:', error);
      return `fallback_voter_${Date.now()}`;
    }
  };

  const categories = [...new Set(performances.map((p) => p.category?.name).filter(Boolean))] as string[];
  const filteredPerformances =
    categoryFilter === 'all'
      ? performances
      : performances.filter((p) => p.category?.name === categoryFilter);

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
            {filteredPerformances.map((performance) => {
              const participantName = performance.participant?.full_name || 'Unknown Participant';
              const teamName = performance.participant?.team_name;
              const categoryName = performance.category?.name || 'Uncategorized';
              const categoryType = performance.category?.type || 'other';
              const isGroup = performance.category?.is_group || false;

              // Debug log for each performance
              console.log('Rendering performance:', {
                title: performance.performance_title,
                participant: performance.participant,
                participantName,
                teamName
              });

              return (
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
                            categoryType === 'singing'
                              ? 'bg-purple-100 text-purple-800'
                              : categoryType === 'dancing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isGroup ? <UsersIcon className="w-3 h-3 mr-1" /> : null}
                          {categoryName}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          {performance.performance_title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {teamName || participantName}
                          {!performance.participant && (
                            <span className="text-xs text-orange-500 ml-2">(No participant data)</span>
                          )}
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
              );
            })}
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
