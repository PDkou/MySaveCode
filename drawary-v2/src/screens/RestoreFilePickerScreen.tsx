import { useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './RestoreFilePickerScreen.css';

export interface RestoreFilePickerScreenProps {
  onBack?: () => void;
  onFileSelected?: (file: File) => void;
}

/**
 * #49 복원 파일 선택. Ported from
 * `Drawary_49_RESTORE_FILE_PICKER_CANDIDATE_2026-10-14`'s `index.html`
 * -- the real native `<input type="file">` picker (not simulated),
 * same `.zip`/`.json` filter, same reject-silently-on-wrong-extension
 * behavior. Reached from #44's "복원하기" row; selecting a valid file
 * -> #50.
 */
export function RestoreFilePickerScreen({ onBack, onFileSelected }: RestoreFilePickerScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('.zip 또는 .json 파일');

  const openPicker = () => inputRef.current?.click();

  const handleChange = () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    if (!/\.(zip|json)$/i.test(file.name)) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setFileName(file.name);
    onFileSelected?.(file);
  };

  return (
    <main className="rfp49-screen" aria-label="복원 파일 선택 화면">
      <ScreenHeader title="복원" onBack={onBack} height={88} />
      <section className="rfp49-panel" aria-label="복원할 파일 선택">
        <div className="rfp49-content">
          <img className="rfp49-art" src="/assets/states/backup/state_restore_available.webp" alt="복원을 준비하는 서랍장 마스코트" />
          <h1 className="rfp49-heading">복원할 백업 파일을 선택해주세요</h1>
          <p className="rfp49-description">Drawary 백업 파일을 불러와<br />기록과 설정을 복원할 수 있어요.</p>
          <button className="rfp49-pick-card" type="button" aria-label="백업 파일 선택" onClick={openPicker}>
            <span className="rfp49-pick-icon"><img src="/assets/ui-icons/icon_import.webp" alt="" /></span>
            <span className="rfp49-pick-text"><strong>백업 파일 선택</strong><small>{fileName}</small></span>
            <span className="rfp49-chevron" aria-hidden="true" />
          </button>
          <p className="rfp49-hint">파일을 선택하면 복원할 내용을 먼저 확인할 수 있어요.</p>
        </div>
        <button className="rfp49-confirm" type="button" onClick={openPicker}>파일 선택</button>
      </section>
      <input
        ref={inputRef}
        type="file"
        className="rfp49-file-input"
        accept=".zip,.json,application/zip,application/json"
        aria-label="Drawary 백업 파일을 선택해주세요"
        onChange={handleChange}
      />
    </main>
  );
}
