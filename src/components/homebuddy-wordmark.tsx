import wordmark from "@/assets/homebuddy-wordmark.png.asset.json";

/**
 * Apple-signature style write-on animation for the homebuddy wordmark.
 * Left-to-right clip-path reveal + soft "ink head" glow sweep + subtle settle.
 * 1.8s total duration; respects prefers-reduced-motion.
 */
export function HomebuddyWordmark() {
  return (
    <>
      <div className="homebuddy-logo-wrap">
        <img className="homebuddy-logo" src={wordmark.url} alt="HomeBuddy" />
      </div>
      <style>{`
        .homebuddy-logo-wrap {
          width: min(72vw, 368px);
          position: relative;
          overflow: hidden;
          animation: homebuddy-settle 1.8s cubic-bezier(.16, 1, .3, 1) both;
        }
        .homebuddy-logo {
          display: block;
          width: 100%;
          height: auto;
          clip-path: inset(0 100% 0 0);
          opacity: 0;
          filter: blur(5px);
          animation: homebuddy-write-on 1.8s cubic-bezier(.16, 1, .3, 1) both;
        }
        .homebuddy-logo-wrap::before {
          content: "";
          position: absolute;
          inset: -10% auto -10% 0;
          width: 34%;
          z-index: 2;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,.74) 46%,
            rgba(255,255,255,0) 100%
          );
          filter: blur(10px);
          transform: translateX(-120%);
          animation: homebuddy-ink-head 1.8s cubic-bezier(.16, 1, .3, 1) both;
        }
        @keyframes homebuddy-write-on {
          0%   { clip-path: inset(0 100% 0 0); opacity: 0; filter: blur(5px); }
          18%  { opacity: 1; }
          72%  { clip-path: inset(0 0 0 0); filter: blur(0); }
          100% { clip-path: inset(0 0 0 0); opacity: 1; filter: blur(0); }
        }
        @keyframes homebuddy-ink-head {
          0%   { transform: translateX(-120%); opacity: .7; }
          72%  { transform: translateX(330%); opacity: .35; }
          100% { transform: translateX(330%); opacity: 0; }
        }
        @keyframes homebuddy-settle {
          0%   { transform: translateY(10px) scale(.985); }
          72%  { transform: translateY(0) scale(1.012); }
          100% { transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .homebuddy-logo-wrap,
          .homebuddy-logo,
          .homebuddy-logo-wrap::before { animation: none; }
          .homebuddy-logo { opacity: 1; clip-path: inset(0 0 0 0); filter: none; }
          .homebuddy-logo-wrap::before { display: none; }
        }
      `}</style>
    </>
  );
}
