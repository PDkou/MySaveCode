import './SplashScreen.css';

// Branding beat shown on cold start (App.tsx controls the timing budget),
// then fades into Home. Doubles as the PWA/browser "boot screen" the
// native Android wrapper's own splash (see drawary-app's
// Theme.App.Starting) hands off to once the WebView paints.
//
// Uses the finalized Drawary brand lockup (flower mark + wordmark, baked
// into one image) and the mascot's waving pose from the confirmed asset
// package (public/icons/drawary/) -- replaces an earlier hand-animated
// CSS/SVG cabinet-and-folders sequence that predated the mascot/flower
// brand direction.
// Small ambient decoration sprites (public/icons/drawary/decor/) scattered
// in the otherwise-empty corners -- the same kind of flourish already
// baked into the onboarding/mascot art itself, just loose here since the
// splash has open background to fill.
const DECOR = [
  { file: 'decor_001.webp', className: 'decor-tl' },
  { file: 'decor_019.webp', className: 'decor-tr' },
  { file: 'decor_013.webp', className: 'decor-bl' },
  { file: 'decor_020.webp', className: 'decor-br' },
];

export function SplashScreen({ fadingOut }: { fadingOut: boolean }) {
  return (
    <div className={`splash-screen ${fadingOut ? 'fading' : ''}`}>
      {DECOR.map(({ file, className }) => (
        <img
          key={file}
          className={`splash-decor ${className}`}
          src={`/assets/splash-approved/${file}`}
          alt=""
          aria-hidden="true"
        />
      ))}
      <img
        className="splash-logo"
        src="/assets/splash-approved/splash_logo_1024.webp"
        alt="Drawary"
      />
      <img
        className="splash-mascot"
        src="/assets/splash-approved/mascot_wave.webp"
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
