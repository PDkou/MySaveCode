// Purely a branding beat, not a loading gate -- app init (localStorage
// read) is already synchronous/instant, so there's nothing real to wait
// on. Shown on cold start (App.tsx controls the timing budget), then
// fades into Home. Doubles as the PWA/browser "boot screen" the native
// Android wrapper's own splash (see drawary-app's Theme.App.Starting)
// hands off to once the WebView paints.
//
// This recreates the app icon (public/icons/icon-512.png) as CSS/SVG
// shapes -- cream cabinet body + teal feet, green top/bottom drawers,
// coral middle drawer, four folders bursting out -- color-matched and
// shaped to read as the same object as the real icon, not the flatter
// hand-drawn version an earlier pass shipped. It's built from a
// standalone animation the user iterated on directly in an external
// tool, not tuned in-repo; the delay/duration/path numbers below are
// copied verbatim from that export. Runs once on load (never replayed),
// so plain SMIL <animateMotion>/<mpath> for the folder flight paths is
// fine here -- the restart-reliability problem that pushed the earlier
// splash-tuner prototype onto CSS offset-path only matters for a
// live-editable tool, not a fire-once splash.
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
                <path id="dw-route-coral" d="M215 150 C185 105 130 80 100 65" />
                <path id="dw-route-yellow" d="M215 150 C195 85 155 45 155 20" />
                <path id="dw-route-blue" d="M215 150 C235 85 275 45 275 20" />
                <path id="dw-route-teal" d="M215 150 C245 105 300 80 330 65" />
                <linearGradient id="dw-coral-fill" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#ff7b73" />
                  <stop offset="1" stopColor="#ef4f4d" />
                </linearGradient>
                <linearGradient id="dw-yellow-fill" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#ffd143" />
                  <stop offset="1" stopColor="#eba514" />
                </linearGradient>
                <linearGradient id="dw-blue-fill" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#5ba7ff" />
                  <stop offset="1" stopColor="#347de2" />
                </linearGradient>
                <linearGradient id="dw-teal-fill" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#30cfbd" />
                  <stop offset="1" stopColor="#0b9f9d" />
                </linearGradient>
              </defs>

              <path className="dw-trail dw-trail-dash dw-trail-dash-1 dw-trail-coral" d="M99 81 C95 78 91 75 88 72" />
              <path className="dw-trail dw-trail-dash dw-trail-dash-2 dw-trail-coral" d="M84 69 C80 66 77 64 74 62" />

              <path className="dw-trail dw-trail-dash dw-trail-dash-1 dw-trail-yellow" d="M106 68 C105 63 103 58 102 54" />
              <path className="dw-trail dw-trail-dash dw-trail-dash-2 dw-trail-yellow" d="M99 47 C97 42 95 37 94 34" />

              <path className="dw-trail dw-trail-dash dw-trail-dash-1 dw-trail-blue" d="M115 68 C117 63 118 58 120 54" />
              <path className="dw-trail dw-trail-dash dw-trail-dash-2 dw-trail-blue" d="M122 47 C124 42 126 37 127 34" />

              <path className="dw-trail dw-trail-dash dw-trail-dash-1 dw-trail-teal" d="M121 81 C125 78 129 75 132 72" />
              <path className="dw-trail dw-trail-dash dw-trail-dash-2 dw-trail-teal" d="M136 69 C140 66 143 64 146 62" />

              <g className="dw-folder dw-folder-coral">
                <animateMotion begin=".94s" dur=".66s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".16 .86 .3 1">
                  <mpath href="#dw-route-coral" />
                </animateMotion>
                <g transform="rotate(-18) scale(1.22)">
                  <rect className="dw-folder-paper" x="-16" y="-15" width="32" height="18" rx="4" />
                  <path className="dw-folder-face" fill="url(#dw-coral-fill)" stroke="#dc4545" d="M-22-11h15l4-5h12l4 5h9v22q0 5-5 5h-34q-5 0-5-5z" />
                </g>
              </g>
              <g className="dw-folder dw-folder-yellow">
                <animateMotion begin="1s" dur=".68s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".16 .86 .3 1">
                  <mpath href="#dw-route-yellow" />
                </animateMotion>
                <g transform="rotate(-8) scale(1.22)">
                  <rect className="dw-folder-paper" x="-16" y="-15" width="32" height="18" rx="4" />
                  <path className="dw-folder-face" fill="url(#dw-yellow-fill)" stroke="#d99612" d="M-22-11h15l4-5h12l4 5h9v22q0 5-5 5h-34q-5 0-5-5z" />
                </g>
              </g>
              <g className="dw-folder dw-folder-blue">
                <animateMotion begin="1.06s" dur=".69s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".16 .86 .3 1">
                  <mpath href="#dw-route-blue" />
                </animateMotion>
                <g transform="rotate(10) scale(1.22)">
                  <rect className="dw-folder-paper" x="-16" y="-15" width="32" height="18" rx="4" />
                  <path className="dw-folder-face" fill="url(#dw-blue-fill)" stroke="#2e70d1" d="M-22-11h15l4-5h12l4 5h9v22q0 5-5 5h-34q-5 0-5-5z" />
                </g>
              </g>
              <g className="dw-folder dw-folder-teal">
                <animateMotion begin="1.12s" dur=".67s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".16 .86 .3 1">
                  <mpath href="#dw-route-teal" />
                </animateMotion>
                <g transform="rotate(18) scale(1.22)">
                  <rect className="dw-folder-paper" x="-16" y="-15" width="32" height="18" rx="4" />
                  <path className="dw-folder-face" fill="url(#dw-teal-fill)" stroke="#078c8c" d="M-22-11h15l4-5h12l4 5h9v22q0 5-5 5h-34q-5 0-5-5z" />
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

            <div className="dw-drawer-middle">
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
