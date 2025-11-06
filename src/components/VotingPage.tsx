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
  };
  category: {
    name: string;
    type: string;
    is_group: boolean;
  };
  vote_count: number;
  has_voted: boolean;
}

export default function VotingPage() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchPerformances();
  }, []);

  const fetchPerformances = async () => {
    setLoading(true);

    // Fetch performances with participant and category info
    const { data: performanceData, error } = await supabase
      .from('final_performances')
      .select(`
        id,
        performance_title,
        performance_image_url,
        performance_order,
        participant:participants(full_name, team_name),
        category:categories(name, type, is_group)
      `)
    .eq('is_active', true) 
      .order('performance_order');

    if (error || !performanceData) {
      console.error('Error fetching performances:', error);
      setLoading(false);
      return;
    }

    // Fetch vote counts for each performance
    const { data: voteData } = await supabase
      .from('performance_votes')
      .select('performance_id');

    // Count votes per performance
    const voteCounts: Record<string, number> = {};
    voteData?.forEach((vote) => {
      voteCounts[vote.performance_id] = (voteCounts[vote.performance_id] || 0) + 1;
    });

    // Check which performances current user has voted for (by IP simulation using localStorage)
    const votedPerformances = getVotedPerformances();

    const performancesWithVotes = (performanceData as any[]).map((perf) => ({
      ...perf,
      vote_count: voteCounts[perf.id] || 0,
      has_voted: votedPerformances.includes(perf.id),
    }));

    setPerformances(performancesWithVotes);
    setLoading(false);
  };

  const getVotedPerformances = (): string[] => {
    const voted = localStorage.getItem('voted_performances');
    return voted ? JSON.parse(voted) : [];
  };

  const markAsVoted = (performanceId: string) => {
    const voted = getVotedPerformances();
    voted.push(performanceId);
    localStorage.setItem('voted_performances', JSON.stringify(voted));
  };

  const handleVote = async (performanceId: string) => {
    const votedPerformances = getVotedPerformances();
    if (votedPerformances.includes(performanceId)) {
      setMessage({ type: 'error', text: 'You have already voted for this performance!' });
      return;
    }

    setVotingFor(performanceId);
    setMessage(null);

    // Simulate IP address (in production, this would be handled by backend)
    const voterIP = getVoterIdentifier();

    const { error } = await supabase.from('performance_votes').insert({
      performance_id: performanceId,
      voter_ip: voterIP,
      voter_fingerprint: navigator.userAgent,
    });

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        setMessage({ type: 'error', text: 'You have already voted for this performance!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to submit vote. Please try again.' });
      }
    } else {
      markAsVoted(performanceId);
      setMessage({ type: 'success', text: 'Thank you! Your vote has been recorded.' });
      fetchPerformances(); // Refresh to update vote count
    }

    setVotingFor(null);
    setTimeout(() => setMessage(null), 5000);
  };

  const getVoterIdentifier = (): string => {
    // In a real app, this would be the user's IP from the backend
    // For now, we'll use a combination of localStorage and browser fingerprint
    let identifier = localStorage.getItem('voter_id');
    if (!identifier) {
      identifier = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('voter_id', identifier);
    }
    return identifier;
  };

  const categories = [...new Set(performances.map((p) => p.category.name))];
  const filteredPerformances =
    categoryFilter === 'all'
      ? performances
      : performances.filter((p) => p.category.name === categoryFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Loading performances...</div>
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
            <p className="text-xl text-slate-600">No performances available for voting yet.</p>
            <p className="text-sm text-slate-500 mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {filteredPerformances.map((performance) => (
              <div
                key={performance.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow border border-slate-200 overflow-hidden"
              >
                {performance.performance_image_url && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={performance.performance_image_url} 
                      alt={performance.performance_title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Handle image loading errors
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
                          performance.category.type === 'singing'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {performance.category.is_group ? <UsersIcon className="w-3 h-3 mr-1" /> : null}
                        {performance.category.name}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {performance.performance_title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {performance.participant.team_name || performance.participant.full_name}
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



