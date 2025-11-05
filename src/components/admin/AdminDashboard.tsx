import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Users, Calendar, Megaphone, Trophy } from 'lucide-react';
import ParticipantsManagement from './ParticipantsManagement';
import AuditionsManagement from './AuditionsManagement';
import AnnouncementsManagement from './AnnouncementsManagement';
import PopularPerformancesManagement from './PopularPerformancesManagement';

type Tab = 'participants' | 'auditions' | 'announcements' | 'performances';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('participants');
  const { user, signOut } = useAuth();

  const tabs = [
    { id: 'participants' as Tab, label: 'Participants', icon: Users },
    { id: 'auditions' as Tab, label: 'Auditions', icon: Calendar },
    { id: 'announcements' as Tab, label: 'Announcements', icon: Megaphone },
    { id: 'performances' as Tab, label: 'Popular Performances', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
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
                <h1 className="text-2xl font-bold text-slate-900">නාදනූ 2.0 - Admin Dashboard</h1>
                <p className="text-sm text-slate-600 mt-1">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'participants' && <ParticipantsManagement />}
            {activeTab === 'auditions' && <AuditionsManagement />}
            {activeTab === 'announcements' && <AnnouncementsManagement />}
            {activeTab === 'performances' && <PopularPerformancesManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
