// Purely a branding beat, not a loading gate -- app init (localStorage
// read) is already synchronous/instant, so there's nothing real to wait
// on. Shown for a fixed ~900ms on cold start (App.tsx), then fades into
// Home. Doubles as the PWA/browser "boot screen" the native Android
// wrapper's own splash (see drawary-app's Theme.App.Starting) hands off
// to once the WebView paints -- so this is the one place both contexts
// actually share the same brand moment.
export function SplashScreen({ fadingOut }: { fadingOut: boolean }) {
  return (
    <div className={`splash-screen ${fadingOut ? 'fading' : ''}`}>
      <div className="splash-cabinet" aria-hidden="true">
        <span className="splash-drawer">
          <span className="splash-pull" />
        </span>
        <span className="splash-drawer">
          <span className="splash-pull" />
        </span>
        <span className="splash-drawer">
          <span className="splash-pull" />
        </span>
      </div>
      <p className="splash-title">나만의 서랍장</p>
      <p className="splash-tagline">Drawary</p>
    </div>
  );
}
