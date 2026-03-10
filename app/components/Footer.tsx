import Image from "next/image";

export default function Footer() {
  return (
    <footer className="hidden md:block relative z-10 w-full bg-black border-t border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* 左侧：品牌 + 版权 */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex items-center gap-3">
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
            <p className="text-white/70 text-sm">
              © 2026 hashkey. All rights reserved.
            </p>
          </div>

          {/* 中间：Hashoo 链接 */}
          <div className="lg:col-span-3">
            <h3 className="text-white font-semibold text-sm mb-4 tracking-wide">HashKey</h3>
            <ul className="space-y-3">
              {["About Us", "Help Center", "Disclaimer", "Privacy Policy", "Terms of Use"].map((label) => (
                <li key={label}>
                  <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 右侧：取得联系 */}
          <div className="lg:col-span-4 flex flex-col lg:items-end gap-4">
            <div>
              <h3 className="text-white font-semibold text-sm mb-4 tracking-wide">Get in Touch</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
                    Newsletter
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
