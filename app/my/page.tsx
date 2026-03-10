import Link from "next/link";
import ConnectWalletButton from "../components/ConnectWalletButton";
import MySection from "../components/MySection";
import Footer from "../components/Footer";

export const metadata = {
  title: "My | Discovery Hashoo",
  description: "Your blind box records and on-chain proof",
};

export default function MyPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-fuchsia-600/08 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px]" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-10 sm:pt-14 pb-24">
        <section className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight font-display">
              Discovery
              <br />
              Hashoo
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 font-nav">
              <Link
                href="/"
                className="text-white font-medium text-sm hover:text-white transition-colors border-b-2 border-transparent pb-0.5 hover:border-white/30"
              >
                Mystery Box
              </Link>
              <Link
                href="/my"
                className="text-white font-medium text-sm hover:text-white transition-colors border-b-2 border-violet-500 pb-0.5"
              >
                My
              </Link>
            </div>
            <ConnectWalletButton />
          </div>
        </section>

        <MySection />
      </main>

      <Footer />

      <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden flex items-center justify-center gap-20 py-5 px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/95 border-t border-white/[0.06] backdrop-blur-md min-h-[64px]">
        <Link
          href="/"
          className="p-4 text-[#a1a1aa] hover:text-white rounded-2xl active:bg-white/10 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Mystery Box"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </Link>
        <Link
          href="/my"
          className="p-4 text-white rounded-2xl active:bg-white/10 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="My"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </Link>
      </nav>
    </div>
  );
}
