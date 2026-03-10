import BlindBoxCard from "./components/BlindBoxCard";

const BOXES = [{ id: 0, title: "Hashoo系列" }];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* 背景光晕 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-fuchsia-600/08 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px]" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-10 sm:pt-14 pb-24">
        {/* 顶部：大标题 + 右上角图标，无左上角品牌 */}
        <section className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight font-display"
            >
              Discovery
              <br />
              Hashoo
            </h1>
          </div>
          <a
            href="#"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/90 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium font-nav"
            aria-label="Connect Wallet"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a2.25 2.25 0 012.25-2.25 2.25 2.25 0 012.25 2.25V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3H15a2.25 2.25 0 012.25 2.25 2.25 2.25 0 002.25 2.25h2.25a2.25 2.25 0 002.25-2.25V15" />
            </svg>
            Connect Wallet
          </a>
        </section>

        {/* 盲盒网格 */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BOXES.map((box) => (
              <BlindBoxCard
                key={box.id}
                id={box.id}
                title={box.title}
              />
            ))}
          </div>
        </section>
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-12 py-4 px-6 bg-[#0a0a0f]/90 border-t border-white/[0.06] backdrop-blur-md font-nav">
        <a href="#" className="text-white font-medium text-sm">
          Mystery Box
        </a>
        <a href="#" className="text-[#a1a1aa] hover:text-white font-medium text-sm transition-colors">
          My
        </a>
      </nav>
    </div>
  );
}
