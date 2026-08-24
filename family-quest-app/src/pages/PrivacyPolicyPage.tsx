import { useTranslation } from 'react-i18next';

import { useSmartBack } from '../lib/backNav';

// Deliberately NOT routed through i18n like the rest of the app's copy --
// this is a Korean-law-oriented legal document (PIPA/개인정보보호법), and a
// word-for-word translation risks changing its actual legal meaning in a
// way none of this app's other UI copy does. Only the page chrome (back
// button) uses i18n; the body is one fixed Korean-language document
// regardless of the active UI language. See BACKLOG.md if a real
// translated version is ever needed.
//
// 2026-08, written alongside the account-deletion feature (schema.sql
// section 43) this document itself describes -- effective date and every
// factual claim below (what's collected, who processes it, how deletion
// actually works) should be kept in sync with the real implementation,
// not just written once and forgotten.
const EFFECTIVE_DATE = '2026-08-24';
const OPERATOR_NAME = 'Howling Creative Studio';
const CONTACT_EMAIL = 'db5704@gmail.com';

export function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const goBack = useSmartBack('/');

  return (
    <div className="screen privacy-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={goBack}>
          {t('common.back')}
        </button>
        <h1 className="privacy-heading">개인정보처리방침</h1>
      </div>

      <div className="privacy-body">
        <p className="privacy-intro">
          {OPERATOR_NAME}(이하 "운영자")는 이용자의 개인정보를 소중히 다루며, 「개인정보 보호법」 등 관련 법령을
          준수합니다. 본 방침은 운영자가 제공하는 Family Quest 및 Company Quest 서비스(이하 "서비스")에 적용됩니다.
        </p>

        <section>
          <h2>1. 수집하는 개인정보 항목</h2>
          <p>서비스는 아래 항목을 수집합니다.</p>
          <ul>
            <li><strong>필수:</strong> 이메일 주소, 비밀번호(암호화 저장), 표시 이름</li>
            <li>
              <strong>선택:</strong> 생일, 프로필 사진, 상태메시지, 기기 푸시 알림 수신을 위한 브라우저 구독 정보
            </li>
            <li>
              <strong>서비스 이용 과정에서 생성:</strong> 등록한 퀘스트(할 일) 내용, 완료 기록, 댓글, 가족/팀
              채팅 메시지 및 첨부파일, 가족/팀방 소속 및 역할 정보, 포인트·레벨·연속기록 등 게임화 데이터
            </li>
          </ul>
        </section>

        <section>
          <h2>2. 개인정보의 수집 방법</h2>
          <p>회원가입 및 서비스 이용 과정에서 이용자가 직접 입력하거나, 서비스 이용에 따라 자동으로 생성됩니다.</p>
        </section>

        <section>
          <h2>3. 개인정보의 처리 목적</h2>
          <ul>
            <li>회원 식별 및 로그인, 서비스 제공</li>
            <li>가족/팀 구성원 간 퀘스트·채팅 등 협업 기능 제공</li>
            <li>기기 알림(웹 푸시) 발송 (선택 동의 시)</li>
            <li>포인트·레벨·뱃지·칭호 등 게임화 기능 운영</li>
            <li>부정 이용 방지 및 서비스 안정성 확보</li>
          </ul>
        </section>

        <section>
          <h2>4. 개인정보의 보유 및 이용 기간</h2>
          <p>
            이용자가 회원 탈퇴를 신청하면, 신청일로부터 7일의 유예기간이 지난 후 개인을 식별할 수 있는 정보(표시
            이름, 프로필 사진, 생일, 상태메시지 등)는 삭제·익명화되며 계정 로그인은 영구히 차단됩니다. 유예기간
            중에는 언제든 탈퇴를 취소할 수 있습니다. 다만 퀘스트·댓글·채팅 등 다른 이용자와 공유된 기록은 서비스
            운영의 특성상 삭제되지 않고, 작성자 표시만 "탈퇴한 사용자"로 익명화되어 남을 수 있습니다. 관계 법령에
            따라 별도 보관 의무가 있는 경우 해당 기간 동안 보관합니다.
          </p>
        </section>

        <section>
          <h2>5. 개인정보 처리위탁 및 국외 이전</h2>
          <p>
            서비스는 아래와 같은 인프라 제공업체에 개인정보 처리를 위탁하고 있으며, 이 과정에서 개인정보가 해외
            리전의 서버로 이전되어 처리될 수 있습니다.
          </p>
          <ul>
            <li><strong>Supabase, Inc.</strong> — 데이터베이스, 회원 인증, 파일 저장소 운영</li>
            <li><strong>Vercel Inc.</strong> — 서비스(웹 애플리케이션) 호스팅</li>
          </ul>
          <p>위 업체들은 각자의 개인정보처리방침에 따라 정보를 보호하며, 운영자는 위탁 목적 범위를 초과한 처리를 요구하지 않습니다.</p>
        </section>

        <section>
          <h2>6. 이용자의 권리와 행사 방법</h2>
          <p>
            이용자는 언제든지 자신의 개인정보를 열람·정정할 수 있으며(설정 화면), 회원 탈퇴(계정 삭제)를 통해
            처리 정지를 요구할 수 있습니다. 그 밖의 문의는 아래 연락처로 요청할 수 있으며, 지체 없이 조치합니다.
          </p>
        </section>

        <section>
          <h2>7. 개인정보의 파기</h2>
          <p>
            보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구할 수
            없는 방법으로 삭제합니다.
          </p>
        </section>

        <section>
          <h2>8. 쿠키 등 유사 기술의 사용</h2>
          <p>
            서비스는 로그인 세션 유지, 언어·테마 설정 저장, 최초 이용 여부 확인 등을 위해 브라우저의 로컬
            저장소(localStorage)를 사용합니다. 이는 광고 목적의 추적에는 사용되지 않습니다.
          </p>
        </section>

        <section>
          <h2>9. 개인정보의 안전성 확보조치</h2>
          <ul>
            <li>비밀번호는 암호화하여 저장하며, 평문으로 보관하지 않습니다.</li>
            <li>모든 통신 구간에 HTTPS 암호화를 적용합니다.</li>
            <li>데이터베이스 접근 권한을 행 단위로 제한하는 정책(Row Level Security)을 적용해, 이용자는 자신이 속한 가족/팀방의 정보에만 접근할 수 있습니다.</li>
            <li>프로필 사진 등 첨부파일은 비공개 저장소에 보관되며, 접근 권한이 있는 이용자에게만 임시 서명된 URL로 제공됩니다.</li>
          </ul>
        </section>

        <section>
          <h2>10. 만 14세 미만 아동의 개인정보</h2>
          <p>
            서비스는 만 14세 미만 아동의 이용을 예정하고 있지 않으며, 법정대리인의 동의 없이 만 14세 미만 아동의
            개인정보를 의도적으로 수집하지 않습니다. 만 14세 미만 아동의 개인정보가 수집된 사실을 인지한 경우
            지체 없이 삭제 등의 조치를 취합니다.
          </p>
        </section>

        <section>
          <h2>11. 개인정보 보호책임자</h2>
          <p>
            운영자: {OPERATOR_NAME}
            <br />
            연락처(이메일): {CONTACT_EMAIL}
          </p>
          <p className="privacy-hint">
            아직 사업자등록 전 개인 프로젝트 단계로, 사업자등록번호 등 정보는 등록 이후 이 페이지에 추가로
            게시됩니다.
          </p>
        </section>

        <section>
          <h2>12. 고지의 의무</h2>
          <p>
            본 방침의 내용이 변경되는 경우 서비스 내 공지사항 또는 이 페이지를 통해 사전에 고지합니다.
          </p>
        </section>

        <p className="privacy-effective-date">시행일자: {EFFECTIVE_DATE}</p>
      </div>
    </div>
  );
}
