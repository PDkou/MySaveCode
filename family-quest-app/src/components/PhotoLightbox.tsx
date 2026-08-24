import { useBackDismiss } from '../lib/backNav';

interface PhotoLightboxProps {
  src: string;
  onClose: () => void;
}

// A minimal full-screen photo viewer -- 2026-08 feedback asked to be able
// to click the topbar character slot's photo/mascot and see it at full
// size, and nothing like this existed anywhere else in the app to reuse.
// Same backdrop/back-button-dismiss convention as ConfirmModal, but with no
// card chrome around the image itself -- just the photo, centered, tap
// anywhere to close.
export function PhotoLightbox({ src, onClose }: PhotoLightboxProps) {
  useBackDismiss(true, onClose);

  return (
    <div className="modal-backdrop photo-lightbox-backdrop" onClick={onClose}>
      <img src={src} alt="" className="photo-lightbox-image" />
    </div>
  );
}
