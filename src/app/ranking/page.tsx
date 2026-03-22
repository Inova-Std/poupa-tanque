import { Trophy, Medal, MapPin } from "lucide-react";
import { getRanking } from "@/actions/fuel";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const rankingList = await getRanking();

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white pt-12 pb-24 px-6 rounded-b-[2rem] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Trophy className="w-32 h-32" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2 relative z-10">Ranking Global</h1>
        <p className="text-green-100 font-medium relative z-10">Fiscais da Gasosa</p>
      </div>

      <div className="max-w-md mx-auto -mt-16 px-4 space-y-4 relative z-20">
        {rankingList.length === 0 && (
           <p className="text-center text-zinc-500 mt-10">Nenhum report de posto cadastrado ainda. Seja o primeiro a colaborar!</p>
        )}
        
        {rankingList.map((user, index) => {
          const rank = index + 1;
          const reports = user._count?.priceReports || 0;
          return (
            <div key={user.id} className="bg-white rounded-xl shadow-sm border border-zinc-100 p-4 flex items-center justify-between transition-all hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-lg \${rank === 1 ? 'bg-yellow-100 text-yellow-600' : rank === 2 ? 'bg-zinc-200 text-zinc-600' : rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-zinc-50 text-zinc-400'}`}>
                    {rank}
                  </div>
                  {rank <= 3 && (
                    <Medal className={`absolute -bottom-1 -right-1 w-4 h-4 \${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-zinc-500' : 'text-orange-500'}`} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{user.name}</h3>
                  <div className="flex items-center text-xs text-zinc-500 gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{reports} reportes no app</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="block font-bold text-green-600">{user.score}</span>
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Pontos</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
