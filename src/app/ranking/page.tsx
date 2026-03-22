import { Trophy, Medal, MapPin } from "lucide-react";

export default function RankingPage() {
  const mockRanking = [
    { id: 1, name: "João Silva", score: 1450, reports: 12, rank: 1 },
    { id: 2, name: "Maria Santos", score: 1200, reports: 9, rank: 2 },
    { id: 3, name: "Carlos Beta", score: 950, reports: 7, rank: 3 },
    { id: 4, name: "Ana Clara", score: 400, reports: 3, rank: 4 },
    { id: 5, name: "Pedro H.", score: 150, reports: 1, rank: 5 },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="bg-gradient-to-br from-indigo-600 to-blue-600 text-white pt-12 pb-24 px-6 rounded-b-[2rem] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Trophy className="w-32 h-32" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2 relative z-10">Ranking Global</h1>
        <p className="text-indigo-100 font-medium relative z-10">Fiscais da Gasosa</p>
      </div>

      <div className="max-w-md mx-auto -mt-16 px-4 space-y-4 relative z-20">
        {mockRanking.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow-sm border border-zinc-100 p-4 flex items-center justify-between transition-all hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-lg \${user.rank === 1 ? 'bg-yellow-100 text-yellow-600' : user.rank === 2 ? 'bg-zinc-200 text-zinc-600' : user.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-zinc-50 text-zinc-400'}`}>
                  {user.rank}
                </div>
                {user.rank <= 3 && (
                  <Medal className={`absolute -bottom-1 -right-1 w-4 h-4 \${user.rank === 1 ? 'text-yellow-500' : user.rank === 2 ? 'text-zinc-500' : 'text-orange-500'}`} />
                )}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">{user.name}</h3>
                <div className="flex items-center text-xs text-zinc-500 gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{user.reports} reportes verificados</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="block font-bold text-indigo-600">{user.score}</span>
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Pontos</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
