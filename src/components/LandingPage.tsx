import { Music, Users, Calendar, Trophy } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export default function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center mb-6">
            <img src="/nadanu.png" alt="නාදනූ Logo" className="w-32 h-32 md:w-40 md:h-40" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">නාදනූ 2.0</h1>
          <p className="text-xl text-slate-300 mb-2">
            Singing & Dancing Competition
          </p>
          <p className="text-slate-400">
            Organized by Computing Society of ICBT
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto mb-16">
          <div className="p-8 md:p-12 text-center">
            {/*  <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Registration Now Open
            </h2>
            <p className="text-slate-600 mb-8 text-lg">
              Join us for an exciting showcase of talent! Register now to participate in solo or group singing and dancing competitions.
            </p> */}
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Login to Your Account
            </h2>
            <p className="text-slate-600 mb-8 text-lg">
              Registration has now closed. Log in to view your audition details, announcements, and competition updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* <button
               onClick={onRegister}
                className="px-8 py-4 bg-slate-900 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 transition-all transform hover:scale-105 shadow-lg"
              > 
                Register as Participant 
              </button> */}
              <button
                onClick={onLogin}
                className="px-8 py-4 bg-white text-slate-900 text-lg font-semibold rounded-lg border-2 border-slate-900 hover:bg-slate-50 transition-all transform hover:scale-105"
              >
                Login
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            {
              icon: Music,
              title: 'Multiple Categories',
              description: 'Solo & Group Singing and Dancing',
            },
            {
              icon: Users,
              title: 'Team Participation',
              description: 'Compete as individuals or teams',
            },
            {
              icon: Calendar,
              title: 'Scheduled Auditions',
              description: 'Organized audition process',
            },
            {
              icon: Trophy,
              title: 'Grand Finals',
              description: 'Compete for exciting prizes',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-opacity-20 transition-all"
            >
              <feature.icon className="w-12 h-12 text-white mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-300 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Competition Categories
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {['Solo Singing', 'Group Singing', 'Solo Dancing', 'Group Dancing'].map((category) => (
              <div
                key={category}
                className="bg-white bg-opacity-10 rounded-lg p-4 text-center"
              >
                <p className="text-white font-semibold">{category}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12 text-slate-400 text-sm">
          {/* <p>Deadline: 3 Weeks from Registration Open</p> */}
          <p>Computing Society of ICBT 2025</p>
        </div>
      </div>
    </div>
  );
}
