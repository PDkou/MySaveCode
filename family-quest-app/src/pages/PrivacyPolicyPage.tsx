import { useTranslation } from 'react-i18next';

import { useSmartBack } from '../lib/backNav';
import { OPERATOR_NAME, SUPPORT_EMAIL } from '../lib/constants';

// Deliberately NOT routed through ko.json/ja.json like the rest of the
// app's copy -- these are law-oriented legal documents (Korean PIPA /
// Japanese APPI), long and structurally different per jurisdiction rather
// than a short string with a 1:1 translation, and folding them into the
// regular locale files would bloat those awkwardly. Instead this file
// hand-writes both full documents and picks one by the current UI language
// (i18n.language) -- same two languages the rest of the app supports, just
// switched here directly instead of through i18next's own key lookup.
//
// 2026-08, written alongside the account-deletion feature (schema.sql
// section 43) this document itself describes; the ja version added once
// Japan was confirmed as the actual publishing market (not just a
// secondary UI language) -- effective date and every factual claim below
// (what's collected, who processes it, how deletion actually works) should
// be kept in sync with the real implementation in BOTH languages, not just
// written once and forgotten.
const EFFECTIVE_DATE_KO = '2026-08-24';
const EFFECTIVE_DATE_JA = '2026年8月24日';

function PrivacyPolicyKo() {
  return (
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
          연락처(이메일): {SUPPORT_EMAIL}
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

      <p className="privacy-effective-date">시행일자: {EFFECTIVE_DATE_KO}</p>
    </div>
  );
}

// Written for Japan as an actual publishing market, not a mechanical
// translation of the ko version above -- structure follows APPI
// (個人情報保護法) convention: purposes of use enumerated specifically
// (Article 17), cloud infrastructure treated as entrustment (委託) rather
// than third-party provision, and a dedicated cross-border transfer
// disclosure (Article 28) naming the destination country, since Supabase/
// Vercel's infrastructure runs on servers outside Japan. Age-gating is
// worded as guidance ("保護者の同意を得た上で") rather than asserting a
// specific statutory age the way the ko version cites Korea's 만 14세 --
// Japan has no single equivalent bright-line age in APPI itself.
function PrivacyPolicyJa() {
  return (
    <div className="privacy-body">
      <p className="privacy-intro">
        {OPERATOR_NAME}(以下「運営者」)は、利用者の個人情報を大切に取り扱い、個人情報保護法をはじめとする関連法令を
        遵守します。本ポリシーは、運営者が提供するFamily Quest及びCompany Questサービス(以下「本サービス」)に
        適用されます。
      </p>

      <section>
        <h2>1. 取得する個人情報の項目</h2>
        <p>本サービスは以下の項目を取得します。</p>
        <ul>
          <li><strong>必須:</strong> メールアドレス、パスワード(暗号化して保存)、表示名</li>
          <li>
            <strong>任意:</strong> 誕生日、プロフィール写真、ステータスメッセージ、端末プッシュ通知を受け取るための
            ブラウザ購読情報
          </li>
          <li>
            <strong>利用に伴い生成される情報:</strong> 登録したクエスト(タスク)内容、完了記録、コメント、家族/
            チームチャットのメッセージ及び添付ファイル、家族/チームルームへの所属及び役割情報、ポイント・レベル・
            連続記録などのゲーミフィケーションデータ
          </li>
        </ul>
      </section>

      <section>
        <h2>2. 個人情報の取得方法</h2>
        <p>会員登録及びサービス利用の過程で、利用者が直接入力するか、サービス利用に伴い自動的に生成されます。</p>
      </section>

      <section>
        <h2>3. 個人情報の利用目的</h2>
        <ul>
          <li>会員の識別及びログイン、サービスの提供</li>
          <li>家族/チームメンバー間のクエスト・チャットなどの協業機能の提供</li>
          <li>端末通知(ウェブプッシュ)の送信(任意同意時)</li>
          <li>ポイント・レベル・バッジ・称号などのゲーミフィケーション機能の運営</li>
          <li>不正利用の防止及びサービスの安定性確保</li>
        </ul>
      </section>

      <section>
        <h2>4. 個人情報の保有及び利用期間</h2>
        <p>
          利用者が退会を申請すると、申請日から7日間の猶予期間の経過後、個人を識別できる情報(表示名、プロフィール
          写真、誕生日、ステータスメッセージなど)は削除・匿名化され、アカウントへのログインは永久に停止されます。
          猶予期間中は、いつでも退会を取り消すことができます。ただし、クエスト・コメント・チャットなど他の利用者と
          共有された記録は、サービス運営の性質上削除されず、作成者表示のみ「退会したユーザー」として匿名化されて
          残る場合があります。関連法令により別途保管義務がある場合は、当該期間保管します。
        </p>
      </section>

      <section>
        <h2>5. 個人情報の取扱いの委託及び国外移転</h2>
        <p>
          本サービスは、以下のインフラ事業者に個人情報の取扱いを委託しており、この過程で個人情報が国外のサーバーで
          処理される場合があります。
        </p>
        <ul>
          <li><strong>Supabase, Inc.</strong>(米国) — データベース、会員認証、ファイルストレージの運用</li>
          <li><strong>Vercel Inc.</strong>(米国) — サービス(ウェブアプリケーション)のホスティング</li>
        </ul>
        <p>
          上記事業者は各社のプライバシーポリシーに従って情報を保護しており、運営者は委託目的の範囲を超えた取扱いを
          求めません。国外への移転にあたっては、適切な安全管理措置が講じられていることを確認しています。
        </p>
      </section>

      <section>
        <h2>6. 利用者の権利と行使方法</h2>
        <p>
          利用者は、いつでも自身の個人情報の開示・訂正を求めることができ(設定画面)、退会(アカウント削除)を通じて
          利用停止を求めることができます。その他のお問い合わせは下記連絡先までご連絡いただければ、遅滞なく対応いたします。
        </p>
      </section>

      <section>
        <h2>7. 個人情報の削除</h2>
        <p>
          保有期間が経過するか、利用目的が達成された個人情報は、遅滞なく削除します。電子ファイルは復元不可能な
          方法で削除します。
        </p>
      </section>

      <section>
        <h2>8. Cookie等の類似技術の利用</h2>
        <p>
          本サービスは、ログインセッションの維持、言語・テーマ設定の保存、初回利用の確認などのために、ブラウザの
          ローカルストレージ(localStorage)を使用します。これは広告目的の追跡には使用されません。
        </p>
      </section>

      <section>
        <h2>9. 個人情報の安全管理措置</h2>
        <ul>
          <li>パスワードは暗号化して保存し、平文では保管しません。</li>
          <li>すべての通信区間にHTTPS暗号化を適用します。</li>
          <li>データベースへのアクセス権限を行単位で制限するポリシー(Row Level Security)を適用し、利用者は自身が所属する家族/チームルームの情報にのみアクセスできます。</li>
          <li>プロフィール写真などの添付ファイルは非公開のストレージに保管され、アクセス権限のある利用者にのみ一時的な署名付きURLで提供されます。</li>
        </ul>
      </section>

      <section>
        <h2>10. 未成年者の個人情報について</h2>
        <p>
          本サービスをご利用になる未成年の方は、保護者の同意を得た上でご利用ください。保護者の同意なく未成年者の
          個人情報が取得されたことが判明した場合、遅滞なく削除等の措置を取ります。
        </p>
      </section>

      <section>
        <h2>11. 個人情報保護管理者</h2>
        <p>
          運営者: {OPERATOR_NAME}
          <br />
          連絡先(メール): {SUPPORT_EMAIL}
        </p>
        <p className="privacy-hint">
          現在は法人登記前の個人プロジェクト段階のため、法人情報等は登記後に本ページへ追記します。
        </p>
      </section>

      <section>
        <h2>12. 告知義務</h2>
        <p>本ポリシーの内容が変更される場合は、サービス内のお知らせまたは本ページを通じて事前に告知します。</p>
      </section>

      <p className="privacy-effective-date">施行日: {EFFECTIVE_DATE_JA}</p>
    </div>
  );
}

export function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation();
  const goBack = useSmartBack('/');
  const isJapanese = i18n.language === 'ja';

  return (
    <div className="screen privacy-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={goBack}>
          {t('common.back')}
        </button>
        <h1 className="privacy-heading">{isJapanese ? 'プライバシーポリシー' : '개인정보처리방침'}</h1>
      </div>

      {isJapanese ? <PrivacyPolicyJa /> : <PrivacyPolicyKo />}
    </div>
  );
}
