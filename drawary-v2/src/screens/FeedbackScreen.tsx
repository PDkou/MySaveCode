import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import './FeedbackScreen.css';

export type FeedbackType = 'improvement' | 'bug' | 'feature' | 'other';

export interface FeedbackDraft {
  type: FeedbackType;
  message: string;
  email: string;
  attachment: File | null;
}

export interface FeedbackScreenProps {
  onBack?: () => void;
  onSubmit?: (draft: FeedbackDraft) => void;
}

const TYPE_CONFIG: Record<FeedbackType, { name: string; icon: string; iconClass?: string; placeholder: string; hint: string }> = {
  improvement: { name: '개선 제안', icon: '/assets/decor/decor_sprout_01.webp', placeholder: '어떤 점이 불편했나요? 이렇게 바뀌면 좋겠다는 생각도 좋아요.', hint: '어떤 화면에서 느낀 점인지 알려주시면 도움이 돼요.' },
  bug: { name: '오류 제보', icon: '/assets/ui-icons/feedback_error_from_approved.png', iconClass: 'fb59-approved-crop', placeholder: '어느 화면에서 어떤 문제가 있었나요? 발생한 순서대로 적어주세요.', hint: '오류가 난 화면과 동작을 적어주시면 확인에 도움이 돼요.' },
  feature: { name: '기능 요청', icon: '/assets/decor/decor_flower_01.webp', placeholder: '어떤 기능이 있으면 좋을까요? 사용하는 상황도 알려주세요.', hint: '어떤 상황에서 필요한지 함께 알려주시면 좋아요.' },
  other: { name: '기타', icon: '/assets/ui-icons/feedback_other_from_approved.png', iconClass: 'fb59-approved-crop', placeholder: '하고 싶은 이야기를 자유롭게 남겨주세요.', hint: '칭찬, 질문, 다른 의견도 모두 환영해요.' },
};

const TYPES: FeedbackType[] = ['improvement', 'bug', 'feature', 'other'];
const DEFAULT_ATTACH_CAPTION = '오류 화면이 있다면 첨부해 주세요. (선택)';
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

/**
 * #59 피드백. Ported from `FINAL_STAGED_2026-10-14`'s `index.html` --
 * the real form logic ported 1:1: type selection swaps the textarea
 * placeholder/hint live; the attachment row only appears for "오류
 * 제보" per README.md ("오류 제보일 때만 이미지 첨부 항목 표시"); real
 * file-type (.png/.jpg/.webp) and size (8MB) validation on attachment
 * selection; character counter (max 1000); submit validates a
 * non-empty message and, only if filled in, a well-formed email before
 * calling `onSubmit`. New `feedback_error_from_approved.png`/
 * `feedback_other_from_approved.png` assets copied in (the archive's
 * own files, kept as `.png` since that's what was given); the other
 * two type icons and the hero decorations reuse this app's existing
 * `decor_sprout_01.webp`/`decor_flower_01.webp`/`mascot_lean_on_drawer
 * .webp`. Per the source's own fallback ("현재 미리보기에서는 전송되지
 * 않아요"), there's no real submission backend -- submitting shows a
 * status banner and returns to #55, it does not claim to send anything.
 */
export function FeedbackScreen({ onBack, onSubmit }: FeedbackScreenProps) {
  const [type, setType] = useState<FeedbackType>('improvement');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachCaption, setAttachCaption] = useState(DEFAULT_ATTACH_CAPTION);
  const [status, setStatus] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inform = (text: string) => {
    setStatus(text);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(''), 4500);
  };

  const selectType = (next: FeedbackType) => {
    setType(next);
    if (next !== 'bug') {
      setAttachment(null);
      setAttachCaption(DEFAULT_ATTACH_CAPTION);
    }
  };

  const handleAttachmentChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setAttachCaption(DEFAULT_ATTACH_CAPTION);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      e.target.value = '';
      setAttachCaption('PNG, JPG, WebP 이미지를 선택해 주세요.');
      inform('이미지 파일만 첨부할 수 있어요.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      e.target.value = '';
      setAttachCaption('8MB 이하 이미지를 선택해 주세요.');
      inform('이미지 파일은 8MB 이하로 선택해 주세요.');
      return;
    }
    setAttachment(file);
    setAttachCaption(file.name);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    const trimmedEmail = email.trim();
    if (!trimmedMessage) {
      messageRef.current?.focus();
      inform('피드백 내용을 입력해 주세요.');
      return;
    }
    if (trimmedEmail && !emailRef.current?.checkValidity()) {
      emailRef.current?.focus();
      inform('이메일 주소를 확인해 주세요.');
      return;
    }
    const draft: FeedbackDraft = { type, message: trimmedMessage, email: trimmedEmail, attachment: type === 'bug' ? attachment : null };
    if (onSubmit) {
      // Real integration addition beyond the source: the archive's own
      // "else" branch only fires when no onSubmit is wired at all, so
      // it never shows a success message for a real submission. Since
      // App.tsx does wire a real onSubmit (no backend, but a real
      // "received" acknowledgment), show one here instead of silently
      // calling the callback with no feedback to the user.
      inform('피드백을 보내주셔서 감사해요.');
      onSubmit(draft);
    } else {
      inform('현재 미리보기에서는 전송되지 않아요. 실제 앱 연결이 필요해요.');
    }
  };

  const config = TYPE_CONFIG[type];

  return (
    <main className="fb59-screen" aria-label="Drawary 피드백 화면">
      <header className="fb59-appbar">
        {onBack && <button className="fb59-back" type="button" aria-label="뒤로 가기" onClick={onBack} />}
        <h1>피드백</h1>
      </header>
      <div className="fb59-main">
        <section className="fb59-hero" aria-label="피드백 안내">
          <p className="fb59-hero-kicker">당신의 의견이 필요해요</p>
          <h2 className="fb59-hero-title">작은 의견 하나가<br />더 편리한 Drawary를<br />만들어요.</h2>
          <p className="fb59-hero-desc">좋았던 점도, 아쉬웠던 점도<br />편하게 들려주세요.</p>
          <div className="fb59-hero-orb" aria-hidden="true" />
          <img className="fb59-hero-mascot" src="/assets/mascot/mascot_lean_on_drawer.webp" alt="" />
          <img className="fb59-hero-flower" src="/assets/decor/decor_flower_01.webp" alt="" />
        </section>
        <form id="fb59-form" onSubmit={handleSubmit} noValidate>
          <h3 className="fb59-section-label">어떤 이야기인가요?</h3>
          <div className="fb59-types" role="group" aria-label="피드백 종류 선택">
            {TYPES.map((t) => {
              const cfg = TYPE_CONFIG[t];
              return (
                <button
                  key={t}
                  type="button"
                  className={`fb59-type${type === t ? ' selected' : ''}`}
                  aria-pressed={type === t}
                  onClick={() => selectType(t)}
                >
                  <span className="fb59-type-icon"><img className={cfg.iconClass} src={cfg.icon} alt="" /></span>
                  <span className="fb59-type-name">{cfg.name}</span>
                  <span className="fb59-type-check" aria-hidden="true">✓</span>
                </button>
              );
            })}
          </div>
          <div className="fb59-message-title">
            <h3 className="fb59-section-label"><label htmlFor="fb59-message">내용</label></h3>
            <span className="fb59-counter">{message.length} / 1000</span>
          </div>
          <textarea
            id="fb59-message"
            ref={messageRef}
            maxLength={1000}
            required
            placeholder={config.placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="fb59-tip" role="note">
            <img className="fb59-tip-flower" src="/assets/decor/decor_flower_01.webp" alt="" />
            <p>{config.hint}</p>
          </div>
          {type === 'bug' && (
            <label className="fb59-attach" htmlFor="fb59-attachment">
              <span className="fb59-attach-icon" aria-hidden="true">＋</span>
              <span className="fb59-attach-copy"><strong>화면 사진 첨부</strong><span>{attachCaption}</span></span>
              <span className="fb59-attach-right" aria-hidden="true">›</span>
            </label>
          )}
          <input
            type="file"
            id="fb59-attachment"
            hidden
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAttachmentChange}
          />
          <div className="fb59-email-title">
            <div className="fb59-email-row"><label htmlFor="fb59-email">답변 받을 이메일</label><span className="fb59-optional">선택</span></div>
          </div>
          <input
            id="fb59-email"
            ref={emailRef}
            type="email"
            autoComplete="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="fb59-email-hint">답변이 필요한 경우에만 적어주세요. 입력하지 않아도 돼요.</p>
        </form>
      </div>
      <div className="fb59-bottom">
        <button className="fb59-send uf-cta-primary" form="fb59-form" type="submit">피드백 보내기</button>
        <p className="fb59-bottom-note">입력하신 내용을 확인한 뒤 보내주세요.</p>
      </div>
      {status && <div className="fb59-status" role="status" aria-live="polite">{status}</div>}
    </main>
  );
}
