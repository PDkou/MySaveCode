// Purely a branding beat, not a loading gate -- app init (localStorage
// read) is already synchronous/instant, so there's nothing real to wait
// on. Shown on cold start (App.tsx controls the timing budget), then
// fades into Home. Doubles as the PWA/browser "boot screen" the native
// Android wrapper's own splash (see drawary-app's Theme.App.Starting)
// hands off to once the WebView paints.
//
// The cabinet/drawer/folder-burst animation below was hand-tuned by the
// user in a companion timing/coordinate editor (a throwaway tool built
// for this one purpose, not part of the app) rather than in code -- the
// exact delay/duration/rotation/position numbers here are copied
// verbatim from that session's exported values. Colors are picked to
// match the real app icon's own palette (see public/icons/icon-512.png)
// rather than the app chrome's UI tokens, since this recreates that
// specific illustration, not a themed UI surface.
export function SplashScreen({ fadingOut }: { fadingOut: boolean }) {
  return (
    <div className={`splash-screen ${fadingOut ? 'fading' : ''}`}>
      <div className="splash-stage" aria-hidden="true">
        <div className="dw-cabinet">
          <div className="dw-drawer dw-drawer-top">
            <span className="dw-handle" />
          </div>
          <div className="dw-slot">
            <svg className="dw-trails" viewBox="0 0 220 100" preserveAspectRatio="xMidYMid meet">
              <defs>
                <path id="dw-route-coral" d="M110 87 C99 83 84 70 72 61" />
                <path id="dw-route-yellow" d="M110 87 C107 65 100 42 92 27" />
                <path id="dw-route-blue" d="M110 87 C114 65 121 43 128 29" />
                <path id="dw-route-teal" d="M110 87 C122 83 137 70 148 61" />
                <linearGradient id="dw-fill-coral" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#ff7b73" />
                  <stop offset="1" stopColor="#ef4f4d" />
                </linearGradient>
                <linearGradient id="dw-fill-yellow" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#ffd143" />
                  <stop offset="1" stopColor="#eba514" />
                </linearGradient>
                <linearGradient id="dw-fill-blue" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#5ba7ff" />
                  <stop offset="1" stopColor="#347de2" />
                </linearGradient>
                <linearGradient id="dw-fill-teal" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#30cfbd" />
                  <stop offset="1" stopColor="#0b9f9d" />
                </linearGradient>
              </defs>
              <use href="#dw-route-coral" className="dw-trail dw-trail-coral" />
              <use href="#dw-route-yellow" className="dw-trail dw-trail-yellow" />
              <use href="#dw-route-blue" className="dw-trail dw-trail-blue" />
              <use href="#dw-route-teal" className="dw-trail dw-trail-teal" />

              <g className="dw-folder dw-folder-coral" style={{ offsetPath: "path('M110 87 C99 83 84 70 72 61')" }}>
                <g transform="rotate(-33) scale(1.22)">
                  <rect className="dw-folder-paper" x="-16" y="-15" width="32" height="18" rx="4" />
                  <path fill="url(#dw-fill-coral)" stroke="#dc4545" strokeWidth="1.2" d="M-22-11h15l4-5h12l4 5h9v22q0 5-5 5h-34q-5 0-5-5z" />
                </g>
              </g>
              <g className="dw-folder dw-folder-yellow" style={{ offsetPath: "path('M110 87 C107 65 100 42 92 27')" }}>
                <g transform="rotate(-14) scale(1.22)">
                  <rect className="dw-folder-paper" x="-16" y="-15" width="32" height="18" rx="4" />
                  <path fill="url(#dw-fill-yellow)" stroke="#d99612" strokeWidth="1.2" d="M-22-11h15l4-5h12l4 5h9v22q0 5-5 5h-34q-5 0-5-5z" />
                </g>
              </g>
              <g className="dw-folder dw-folder-blue" style={{ offsetPath: "path('M110 87 C114 65 121 43 128 29')" }}>
                <g transform="rotate(15) scale(1.22)">
                  <rect className="dw-folder-paper" x="-16" y="-15" width="32" height="18" rx="4" />
                  <path fill="url(#dw-fill-blue)" stroke="#2e70d1" strokeWidth="1.2" d="M-22-11h15l4-5h12l4 5h9v22q0 5-5 5h-34q-5 0-5-5z" />
                </g>
              </g>
              <g className="dw-folder dw-folder-teal" style={{ offsetPath: "path('M110 87 C122 83 137 70 148 61')" }}>
                <g transform="rotate(37) scale(1.22)">
                  <rect className="dw-folder-paper" x="-16" y="-15" width="32" height="18" rx="4" />
                  <path fill="url(#dw-fill-teal)" stroke="#078c8c" strokeWidth="1.2" d="M-22-11h15l4-5h12l4 5h9v22q0 5-5 5h-34q-5 0-5-5z" />
                </g>
              </g>
            </svg>

            <i className="dw-particle dw-sparkle dw-p1" />
            <i className="dw-particle dw-sparkle dw-p2" />
            <i className="dw-particle dw-sparkle dw-p3" />
            <i className="dw-particle dw-sparkle dw-p4" />
            <i className="dw-particle dw-stroke dw-p5" />
            <i className="dw-particle dw-stroke dw-p6" />
            <i className="dw-particle dw-stroke dw-p7" />
            <i className="dw-particle dw-stroke dw-p8" />

            <div className="dw-drawer dw-drawer-middle">
              <span className="dw-handle" />
            </div>
          </div>
          <div className="dw-drawer dw-drawer-bottom">
            <span className="dw-handle" />
          </div>
        </div>
      </div>
      <p className="splash-title">나만의 서랍장</p>
      <p className="splash-tagline">Drawary</p>
    </div>
  );
}
