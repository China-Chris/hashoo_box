import Image from "next/image";
import Link from "next/link";
import BlindBoxPagination from "./components/BlindBoxPagination";
import Footer from "./components/Footer";

const BOXES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  title: `Hashoo#${i + 1}`,
  remaining: 99 - i,
}));

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
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
          <div className="flex items-center gap-4">
            {/* 电脑端：Mystery Box、My 在 Connect Wallet 左侧 */}
            <div className="hidden md:flex items-center gap-6 font-nav">
              <Link href="/" className="text-white font-medium text-sm hover:text-white transition-colors border-b-2 border-violet-500 pb-0.5">
                Mystery Box
              </Link>
              <Link href="/my" className="text-white font-medium text-sm hover:text-white transition-colors border-b-2 border-transparent pb-0.5 hover:border-white/30">
                My
              </Link>
            </div>
            <a
              href="#"
              className="px-4 py-2.5 rounded-2xl border border-violet-500/30 bg-violet-600/80 text-white hover:bg-violet-500/90 transition-colors text-sm font-medium font-nav"
              aria-label="Connect Wallet"
            >
              Connect Wallet
            </a>
          </div>
        </section>

        {/* 盲盒区域：网页端带翻页器，移动端单卡 */}
        <section className="mt-8 md:mt-0">
          <BlindBoxPagination boxes={BOXES} />
        </section>

        {/* 移动端：盲盒与底栏之间的祝福文案 */}
        <p className="md:hidden text-center text-[#71717a] text-sm font-nav py-8 px-4">
          May every open bring you a surprise. 🌸
        </p>

        {/* 移动端：祝福下方 logo + HASHKEY + 版权 */}
        <div className="md:hidden flex flex-col gap-6 py-8 px-4">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/logo.png"
              alt="hashkey"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
            />
            <span className="text-white font-semibold text-lg tracking-tight" style={{ fontFamily: "var(--font-museo), sans-serif" }}>
              HASHKEY
            </span>
          </div>
          <p className="text-center text-white/70 text-sm">
            © 2026 hashkey. All rights reserved.
          </p>
        </div>
      </main>

      {/* 页脚：仅网页端显示 */}
      <Footer />

      {/* 底部导航：仅移动端显示，图标 */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden flex items-center justify-center gap-20 py-5 px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/95 border-t border-white/[0.06] backdrop-blur-md min-h-[64px]">
        <Link href="/" className="p-4 text-white rounded-2xl active:bg-white/10 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Mystery Box">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </Link>
        <Link href="/my" className="p-4 text-[#a1a1aa] hover:text-white rounded-2xl active:bg-white/10 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="My">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </Link>
      </nav>
    </div>
  );
}
