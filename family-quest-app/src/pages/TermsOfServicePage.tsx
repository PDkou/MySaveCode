import { useTranslation } from 'react-i18next';

import { useSmartBack } from '../lib/backNav';
import { OPERATOR_NAME } from '../lib/constants';

// Same reasoning as PrivacyPolicyPage.tsx (see that file's own top comment)
// -- hand-written ko/ja legal documents picked by i18n.language, not routed
// through ko.json/ja.json. Written to complement the privacy policy, not
// duplicate it: account deletion mechanics and what's collected already
// live there and are only cross-referenced here, not restated.
const EFFECTIVE_DATE_KO = '2026-08-24';
const EFFECTIVE_DATE_JA = '2026年8月24日';

function TermsOfServiceKo() {
  return (
    <div className="privacy-body">
      <p className="privacy-intro">
        본 약관은 {OPERATOR_NAME}(이하 "운영자")가 제공하는 Family Quest 및 Company Quest 서비스(이하
        "서비스")의 이용과 관련하여 운영자와 이용자 간의 권리·의무 및 책임사항을 정합니다.
      </p>

      <section>
        <h2>제1조 (목적)</h2>
        <p>
          본 약관은 서비스 이용에 관한 조건 및 절차, 운영자와 이용자의 권리·의무 및 책임사항을 규정함을
          목적으로 합니다.
        </p>
      </section>

      <section>
        <h2>제2조 (이용계약의 성립)</h2>
        <p>① 이용계약은 이용자가 본 약관에 동의하고 회원가입을 완료함으로써 성립합니다.</p>
        <p>② 만 14세 미만 아동은 법정대리인의 동의 없이 회원가입할 수 없습니다.</p>
      </section>

      <section>
        <h2>제3조 (계정 관리)</h2>
        <p>
          ① 이용자는 자신의 계정 정보(이메일, 비밀번호)를 스스로 관리할 책임이 있으며, 제3자에게 양도하거나
          대여할 수 없습니다.
        </p>
        <p>② 계정 정보의 관리 소홀로 발생한 손해에 대해 운영자는 책임을 지지 않습니다.</p>
      </section>

      <section>
        <h2>제4조 (서비스의 내용)</h2>
        <p>
          서비스는 가족 또는 팀 구성원 간 할 일(퀘스트) 관리, 포인트·레벨·뱃지·칭호 등 게임화 기능, 채팅,
          캘린더, 사진 갤러리, 알림 기능 등을 제공합니다. 운영자는 서비스의 내용을 사전 고지 후 변경할 수
          있습니다.
        </p>
      </section>

      <section>
        <h2>제5조 (이용자의 의무 및 금지행위)</h2>
        <p>이용자는 다음 각 호의 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>타인의 개인정보를 도용하거나 타인을 사칭하는 행위</li>
          <li>다른 이용자에게 불쾌감을 주거나 명예를 훼손하는 콘텐츠 게시</li>
          <li>서비스의 정상적인 운영을 방해하는 행위(부정 접근, 자동화 도구 사용 등)</li>
          <li>관계 법령 또는 본 약관을 위반하는 행위</li>
        </ul>
      </section>

      <section>
        <h2>제6조 (콘텐츠의 권리)</h2>
        <p>① 이용자가 서비스 내에 등록한 콘텐츠(채팅, 사진 등)에 대한 저작권은 이용자 본인에게 있습니다.</p>
        <p>
          ② 이용자는 운영자에게 서비스 제공 목적(저장, 표시, 전송 등)에 필요한 범위 내에서 해당 콘텐츠를
          이용할 수 있는 권리를 부여합니다.
        </p>
      </section>

      <section>
        <h2>제7조 (서비스의 변경 및 중단)</h2>
        <p>
          운영자는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 이 경우
          사전에 공지합니다. 다만 긴급한 경우 사후에 공지할 수 있습니다.
        </p>
      </section>

      <section>
        <h2>제8조 (면책조항)</h2>
        <p>
          ① 서비스는 무료로 제공되며, 운영자는 서비스 이용과 관련하여 발생한 손해에 대해 관계 법령이
          허용하는 범위 내에서 책임을 지지 않습니다.
        </p>
        <p>
          ② 운영자는 천재지변, 서비스가 이용하는 인프라 제공업체(Supabase, Vercel 등)의 장애 등 운영자의
          통제 범위를 벗어난 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.
        </p>
      </section>

      <section>
        <h2>제9조 (계정 이용정지 및 삭제)</h2>
        <p>
          ① 운영자는 이용자가 제5조를 위반한 경우 사전 통지 없이 서비스 이용을 제한하거나 계정을 정지할 수
          있습니다.
        </p>
        <p>
          ② 이용자는 언제든지 설정 화면에서 회원 탈퇴(계정 삭제)를 신청할 수 있으며, 절차는 개인정보처리방침에
          따릅니다.
        </p>
      </section>

      <section>
        <h2>제10조 (준거법 및 관할)</h2>
        <p>
          본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련하여 발생한 분쟁에 대해서는 운영자의
          주소지를 관할하는 법원을 관할 법원으로 합니다.
        </p>
      </section>

      <p className="privacy-effective-date">시행일자: {EFFECTIVE_DATE_KO}</p>
    </div>
  );
}

function TermsOfServiceJa() {
  return (
    <div className="privacy-body">
      <p className="privacy-intro">
        本規約は、{OPERATOR_NAME}(以下「運営者」)が提供するFamily Quest及びCompany Questサービス(以下「本サービス」)の
        利用に関し、運営者と利用者との間の権利・義務及び責任事項を定めるものです。
      </p>

      <section>
        <h2>第1条(目的)</h2>
        <p>本規約は、本サービスの利用に関する条件及び手続き、運営者と利用者の権利・義務及び責任事項を定めることを目的とします。</p>
      </section>

      <section>
        <h2>第2条(利用契約の成立)</h2>
        <p>① 利用契約は、利用者が本規約に同意し、会員登録を完了することによって成立します。</p>
        <p>② 未成年の方は、保護者の同意を得た上でご利用ください。</p>
      </section>

      <section>
        <h2>第3条(アカウントの管理)</h2>
        <p>
          ① 利用者は自身のアカウント情報(メールアドレス、パスワード)を自己の責任で管理するものとし、第三者に譲渡または
          貸与してはなりません。
        </p>
        <p>② アカウント情報の管理不十分により生じた損害について、運営者は責任を負いません。</p>
      </section>

      <section>
        <h2>第4条(本サービスの内容)</h2>
        <p>
          本サービスは、家族またはチームメンバー間のタスク(クエスト)管理、ポイント・レベル・バッジ・称号などの
          ゲーミフィケーション機能、チャット、カレンダー、フォトギャラリー、通知機能などを提供します。運営者は、
          事前告知の上で本サービスの内容を変更することができます。
        </p>
      </section>

      <section>
        <h2>第5条(利用者の義務及び禁止事項)</h2>
        <p>利用者は、以下の各号に該当する行為を行ってはなりません。</p>
        <ul>
          <li>他人の個人情報を盗用し、または他人になりすます行為</li>
          <li>他の利用者に不快感を与え、または名誉を毀損するコンテンツの投稿</li>
          <li>本サービスの正常な運営を妨害する行為(不正アクセス、自動化ツールの使用等)</li>
          <li>関連法令または本規約に違反する行為</li>
        </ul>
      </section>

      <section>
        <h2>第6条(コンテンツの権利)</h2>
        <p>① 利用者が本サービス内に投稿したコンテンツ(チャット、写真等)の著作権は、利用者本人に帰属します。</p>
        <p>
          ② 利用者は、運営者に対し、本サービス提供の目的(保存、表示、送信等)に必要な範囲内で当該コンテンツを
          利用する権利を許諾するものとします。
        </p>
      </section>

      <section>
        <h2>第7条(本サービスの変更及び中断)</h2>
        <p>
          運営者は、運営上または技術上の必要に応じて、本サービスの全部または一部を変更または中断することができ、
          この場合は事前に告知します。ただし、緊急の場合は事後に告知することがあります。
        </p>
      </section>

      <section>
        <h2>第8条(免責事項)</h2>
        <p>
          ① 本サービスは無料で提供されており、運営者は本サービスの利用に関連して生じた損害について、関連法令が
          許容する範囲内で責任を負いません。
        </p>
        <p>
          ② 運営者は、天災地変、本サービスが利用するインフラ事業者(Supabase、Vercel等)の障害など、運営者の
          合理的な制御を超える事由による本サービスの中断について責任を負いません。
        </p>
      </section>

      <section>
        <h2>第9条(アカウントの利用停止及び削除)</h2>
        <p>
          ① 運営者は、利用者が第5条に違反した場合、事前の通知なく本サービスの利用を制限し、またはアカウントを
          停止することができます。
        </p>
        <p>
          ② 利用者は、いつでも設定画面から退会(アカウント削除)を申請することができ、その手続きはプライバシー
          ポリシーに従います。
        </p>
      </section>

      <section>
        <h2>第10条(準拠法及び管轄)</h2>
        <p>
          本規約は大韓民国の法令に準拠して解釈されるものとし、本サービスの利用に関連して生じた紛争については、
          運営者の所在地を管轄する裁判所を管轄裁判所とします。
        </p>
      </section>

      <p className="privacy-effective-date">施行日: {EFFECTIVE_DATE_JA}</p>
    </div>
  );
}

export function TermsOfServicePage() {
  const { t, i18n } = useTranslation();
  const goBack = useSmartBack('/');
  const isJapanese = i18n.language === 'ja';

  return (
    <div className="screen privacy-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={goBack}>
          {t('common.back')}
        </button>
        <h1 className="privacy-heading">{isJapanese ? '利用規約' : '이용약관'}</h1>
      </div>

      {isJapanese ? <TermsOfServiceJa /> : <TermsOfServiceKo />}
    </div>
  );
}
