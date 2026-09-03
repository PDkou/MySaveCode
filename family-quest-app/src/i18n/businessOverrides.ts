// Business-app (Company Quest) copy overrides -- everywhere ko.json/ja.json
// use family-specific wording ("가족"/"家族", "가족방"/"家族の部屋", ...),
// this supplies a team/workspace-flavored replacement instead, per
// DIRECTION_CORRECTION.md's "don't lock user-facing copy to household
// language" principle (originally written for the tycoon redesign, but the
// same reasoning applies to every screen). Only appears when
// lib/appMode.ts's APP_MODE is 'business' -- family-quest-app's own
// ko.json/ja.json are untouched.
//
// Deliberately NOT a find-and-replace pass over the raw JSON text: Korean
// particles (을/를, 이/가, ...) attach differently depending on the
// preceding word, so a mechanical "가족" -> "팀" substitution would produce
// grammatically broken sentences in several of these. Every string below
// is hand-written, not derived.
//
// Shape mirrors ko.json/ja.json's own nesting. Applied via deepMergeLocale
// below rather than a flat spread, so only the leaf keys listed here are
// touched -- everything else in the real locale files passes through
// unchanged, including future additions neither file's authors thought to
// update here (see the deep-merge behavior for arrays: `celebration.messages`
// is a full-array replacement since every entry needed rewording, while
// `help.sections` is patched by numeric index since only some entries do).

export const BUSINESS_OVERRIDES = {
  ko: {
    app: { name: 'Company Quest', tagline: '팀과 함께하는 업무 퀘스트' },
    auth: { displayNamePlaceholder: '팀에 보여질 이름' },
    family: {
      editNameHeading: '팀 공간 이름 변경',
      setupTitle: '팀 공간이 아직 없어요',
      setupSubtitle: '팀 공간을 새로 만들거나, 받은 초대 코드로 참여하세요. 혼자 쓰셔도 좋아요.',
      personalDescription: '팀 없이, 나만의 할 일 관리로 바로 시작해요.',
      createNamePlaceholder: '예: 마케팅팀, 디자인팀',
      shareHint: '이 코드를 팀원에게 공유해서 함께 참여하세요.',
      qrHint: '팀원에게 이 QR코드를 스캔하게 하면 초대 코드가 자동으로 입력돼요.',
      switcherTitle: '팀 공간 전환',
      membersHeading: '팀원 관리',
      removeMemberConfirm: '이 멤버를 팀 공간에서 내보낼까요?',
      leaveFamily: '이 팀 공간 나가기',
      leaveFamilyConfirm: '정말 이 팀 공간을 나가시겠어요? 나가면 다시 초대 코드로 참여해야 해요.',
      error: {
        nameRequired: '팀 공간 이름을 입력해주세요.',
        alreadyInThisFamily: '이미 이 팀 공간에 참여하고 있습니다.',
        codeNotFound: '해당 초대 코드의 팀 공간을 찾을 수 없습니다.',
        cannotRemoveSelf: "본인은 이 기능으로 내보낼 수 없어요. '팀 공간 나가기'를 이용해주세요.",
        unknown: '팀 공간 처리 중 문제가 발생했습니다.',
      },
    },
    celebration: {
      messages: [
        '완벽해요! 오늘도 할 일을 해냈네요 🎉',
        '역시 믿음직한 우리 팀!',
        '최고예요! 한 걸음 더 가까워졌어요',
        '잘했어요! 팀이 편해졌어요',
        '굿잡! 오늘의 영웅은 당신입니다',
        '이 정도면 프로 일잘러!',
        '완료! 팀 모두가 고마워할 거예요',
        '짱이에요! 다음 퀘스트도 기대할게요',
      ],
    },
    tycoon: {
      modeFamily: '팀',
      familyHint: '팀 구성원 모두가 함께 키우는 공용 타이쿤이에요. 누가 탭하든 같은 재화가 쌓여요.',
    },
    // point3만 통째로 갈아치움 -- 원문은 캐릭터 커스터마이징 상점을 홍보하는데, 그 기능 자체가
    // CHARACTER_CUSTOMIZATION_ENABLED로 두 앱 다 꺼져 있어서 그대로 두면 없는 기능을 안내하게
    // 됨(family-quest-app에도 있는 기존 문제, design/ui-visual-system.md에 별도 메모). 대신
    // 회사방에서만 실제로 쓸 수 있는 주간 리포트 CSV 다운로드를 대신 소개. 나머지 항목은 원문이
    // 이미 가족색이 짙지 않아서(온보딩 텍스트엔 "가족"이라는 단어 자체가 없음) 톤만 업무용으로
    // 살짝 다듬음 -- point1Title/point4Title/point4Desc는 그대로 둬도 어색하지 않아 생략.
    onboarding: {
      tagline: '오늘 처리할 업무, 퀘스트로 받아볼까요?',
      point1Desc: '등록하고 담당자까지 정하면 끝, 팀원 모두가 한눈에 확인해요.',
      point2Title: '완료하면 포인트 팡팡!',
      point2Desc: '퀘스트를 마치면 포인트와 경험치를 받고, 레벨업까지 이어져요.',
      point3Title: '주간 리포트로 한눈에',
      point3Desc: '이번 주 팀원별 완료 현황을 확인하고, CSV로 내려받을 수도 있어요.',
    },
    help: {
      sections: {
        0: {
          body: '이메일과 비밀번호로 회원가입할 수 있어요.\n가입할 때 입력한 이름은 팀 공간에 처음 참여할 때 기본 이름으로 쓰이고, 나중에 팀 공간 안에서만 다른 이름으로 바꿀 수도 있어요.\n이메일 인증이 켜져 있는 경우, 가입 후 받은 메일함의 인증 링크를 눌러야 로그인할 수 있어요.',
        },
        1: {
          body: '초대 코드로 팀 공간에 참여하거나, 새 팀 공간을 만들 수 있어요.\n한 계정으로 여러 팀 공간(마케팅팀, 디자인팀 등)에 참여할 수 있고, 팀 공간 이름 옆 화살표를 눌러 전환할 수 있어요.\n프로필 이름을 누르면 지금 보고 있는 팀 공간 안에서만 쓰이는 이름을 따로 설정할 수 있어요.',
        },
        4: {
          body: '종 모양 아이콘에서 인앱 알림을 확인할 수 있어요.\n같은 곳에서 기기 알림(푸시)을 켜면 기한이 임박했을 때나 다른 팀원이 퀘스트를 등록/완료/댓글을 남겼을 때 휴대폰으로 알려드려요.',
        },
        5: {
          body: '퀘스트를 완료할 때마다 골드가 쌓이고 레벨이 올라가요 (레벨이 오를수록 더 많은 골드가 필요해요).\n매일 완료하면 연속 기록(스트릭)이 쌓이고, 다양한 뱃지도 모을 수 있어요.\n대시보드의 "Lv.X" 칩을 누르면 내 기록과 뱃지 컬렉션을 볼 수 있어요.\n"이번 주 완료" 글자를 누르면 팀원별 완료 현황을 볼 수 있어요.',
        },
        7: {
          body: '우측 상단에서 언어(한국어/日本語), 다크모드, 색상 테마(퍼플/핑크/블루/그린/오렌지), 팀 공간 이름을 바꿀 수 있어요.',
        },
      },
    },
    weeklyBreakdown: {
      heading: '이번 주 팀원별 완료 현황',
      total: '이번 주 팀 전체 완료 {{count}}개',
    },
    badges: {
      fifty_quests: { name: '팀의 영웅' },
    },
    // Added along with the chat feature itself (2026-08) -- caught during
    // an app-wide review that this override was missing while every other
    // "가족" string already had one, i.e. Company Quest was showing "가족
    // 채팅" verbatim. Only heading/openButton need it; the rest of chat.*
    // (placeholder, send, error messages, ...) never mentioned "가족" in
    // the first place.
    chat: {
      heading: '팀 채팅',
      openButton: '팀 채팅 열기',
    },
    // "방장" itself is left as-is -- it already goes untranslated elsewhere
    // in this app (e.g. family.error.notAuthorized), a pre-existing gap
    // outside this override's scope. Only "가족방" -> "팀 공간" is patched
    // here, same substitution as every other family.* string above.
    account: {
      error: {
        ownerOfSharedFamily: '다른 멤버가 남아있는 팀 공간의 방장이라 탈퇴할 수 없어요. 방장을 위임하거나 팀 공간을 먼저 나가주세요.',
      },
    },
  },
  ja: {
    app: { name: 'Company Quest', tagline: 'チームでこなす業務クエスト' },
    auth: { displayNamePlaceholder: 'チームに表示される名前' },
    family: {
      editNameHeading: 'チームスペース名を変更',
      setupTitle: 'まだチームスペースがありません',
      setupSubtitle: '新しくチームスペースを作るか、届いた招待コードで参加してください。一人での利用もできます。',
      personalDescription: 'チームなしで、自分だけのタスク管理としてすぐに始められます。',
      shareHint: 'このコードをチームメンバーに共有して、一緒に参加してもらいましょう。',
      qrHint: 'チームメンバーにこのQRコードをスキャンしてもらうと、招待コードが自動で入力されます。',
      switcherTitle: 'チームスペースを切り替え',
      membersHeading: 'チームメンバー管理',
      removeMemberConfirm: 'このメンバーをチームスペースから退出させますか?',
      leaveFamily: 'このチームスペースを退出する',
      leaveFamilyConfirm: '本当にこのチームスペースを退出しますか? 退出すると、再度招待コードで参加する必要があります。',
      error: {
        nameRequired: 'チームスペース名を入力してください。',
        alreadyInThisFamily: 'すでにこのチームスペースに参加しています。',
        codeNotFound: 'その招待コードのチームスペースが見つかりません。',
        cannotRemoveSelf: '自分自身はこの方法では退出できません。「このチームスペースを退出する」をご利用ください。',
        unknown: 'チームスペースの処理に失敗しました。',
      },
    },
    celebration: {
      messages: [
        '完璧です! 今日もタスクをやり遂げましたね🎉',
        'さすが頼れるチーム!',
        '最高です! また一歩前進しました',
        'よくやりました! チームが助かりました',
        'グッジョブ! 今日のヒーローはあなたです',
        'もう立派な仕事のプロですね!',
        '完了! きっとチームみんなが感謝しています',
        'さすがです! 次のクエストも楽しみですね',
      ],
    },
    tycoon: {
      modeFamily: 'チーム',
      familyHint: 'チーム全員で一緒に育てる共有タイクーンです。誰がタップしても同じ通貨が貯まります。',
    },
    // ko側と同じ理由でpoint3のみ丸ごと差し替え -- 元の文言はキャラクターカスタマイズショップの
    // 案内だが、CHARACTER_CUSTOMIZATION_ENABLEDで両アプリとも無効化中のため、そのままでは
    // 存在しない機能を案内してしまう。代わりに会社部屋だけで実際に使える週次レポートのCSV
    // ダウンロードを紹介。
    onboarding: {
      tagline: '今日の業務、クエストにしてみる?',
      point1Desc: '登録して担当まで決めればOK、チームみんなでひと目で確認できます。',
      point2Title: '完了するとポイントざくざく!',
      point2Desc: 'クエストを終えるとポイントと経験値がもらえて、レベルアップにつながります。',
      point3Title: '週次レポートでひと目に',
      point3Desc: '今週のチームメンバー別の完了状況を確認でき、CSVでダウンロードもできます。',
    },
    help: {
      sections: {
        0: {
          body: 'メールアドレスとパスワードで会員登録できます。\n登録時に入力した名前は、チームスペースに初めて参加するときの初期名として使われ、後からチームスペースの中だけ別の名前に変更することもできます。\nメール認証が有効な場合、登録後に届いたメールの認証リンクをタップしないとログインできません。',
        },
        1: {
          body: '招待コードでチームスペースに参加するか、新しく作ることができます。\n1つのアカウントで複数のチームスペース(マーケティングチーム、デザインチームなど)に参加でき、チームスペース名の横の矢印から切り替えられます。\nプロフィール名をタップすると、今見ているチームスペースの中だけで使う名前を別に設定できます。',
        },
        4: {
          body: 'ベルアイコンでアプリ内通知を確認できます。\n同じ場所で端末通知(プッシュ)をオンにすると、期限が近づいたときや他のチームメンバーがクエストを登録・完了・コメントしたときに端末に知らせてくれます。',
        },
        5: {
          body: 'クエストを完了するたびにゴールドが貯まりレベルが上がります(レベルが上がるほど必要なゴールドも増えます)。\n毎日完了すると連続記録(ストリーク)が貯まり、様々なバッジも集められます。\nダッシュボードの「Lv.X」チップをタップすると、自分の記録とバッジコレクションが見られます。\n「今週の完了」の文字をタップすると、チームメンバー別の完了状況が見られます。',
        },
        7: {
          body: '右上で言語(한국어/日本語)、ダークモード、カラーテーマ(パープル/ピンク/ブルー/グリーン/オレンジ)、チームスペースの名前を変更できます。',
        },
      },
    },
    weeklyBreakdown: {
      heading: '今週のチームメンバー別完了状況',
      total: '今週のチーム全体の完了 {{count}}件',
    },
    badges: {
      fifty_quests: { name: 'チームのヒーロー' },
    },
    chat: {
      heading: 'チームチャット',
      openButton: 'チームチャットを開く',
    },
    // "ルーム長" itself is left as-is, same reasoning as the ko override
    // above -- only "家族ルーム" -> "チームスペース" is patched here.
    account: {
      error: {
        ownerOfSharedFamily: '他のメンバーが残っているチームスペースのルーム長のため退会できません。ルーム長を譲るか、先にチームスペースを退出してください。',
      },
    },
  },
};

// Recursive merge with one deliberate extra rule beyond a plain deep-merge:
// when the base value is an Array and the override value is a plain
// Object (not an Array), the override's keys are read as numeric indices
// and merged into a *copy* of the base array element-by-element -- this is
// what lets `help.sections` patch only sections 0/1/4/5/7's `body` field
// above without having to restate the other sections or the untouched
// `title` fields. Passing an actual Array as the override (see
// `celebration.messages`) instead fully replaces the base array, since
// every entry there needed rewording anyway.
export function deepMergeLocale<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    if (Array.isArray(override)) return override as T;
    if (override && typeof override === 'object') {
      const merged = [...(base as unknown[])];
      for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
        const index = Number(key);
        merged[index] = deepMergeLocale(merged[index], value);
      }
      return merged as T;
    }
    return base;
  }
  if (base && typeof base === 'object' && override && typeof override === 'object' && !Array.isArray(override)) {
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
      result[key] = deepMergeLocale((base as Record<string, unknown>)[key], value);
    }
    return result as T;
  }
  return override === undefined ? base : (override as T);
}
