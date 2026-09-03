// Purely a branding beat, not a loading gate -- app init (localStorage
// read) is already synchronous/instant, so there's nothing real to wait
// on. Shown for a fixed ~900ms on cold start (App.tsx), then fades into
// Home. Doubles as the PWA/browser "boot screen" the native Android
// wrapper's own splash (see drawary-app's Theme.App.Starting) hands off
// to once the WebView paints -- so this is the one place both contexts
// actually share the same brand moment.
//
// icon-splash.png is the same illustrated drawer-cabinet art used for the
// app icon (public/icons/), background-removed -- see
// drawary-app/app/src/main/res/drawable-nodpi/ic_launcher_art.png for the
// Android copy of the same cutout. A single static image with a CSS
// pop-in, not a multi-layer "drawer sliding open" animation -- that would
// need the cabinet body and drawer fronts as separate image layers, which
// wasn't part of this asset drop.
export function SplashScreen({ fadingOut }: { fadingOut: boolean }) {
  return (
    <div className={`splash-screen ${fadingOut ? 'fading' : ''}`}>
      <img className="splash-icon" src="./icons/icon-splash.png" alt="" aria-hidden="true" />
      <p className="splash-title">나만의 서랍장</p>
      <p className="splash-tagline">Drawary</p>
    </div>
  );
}
