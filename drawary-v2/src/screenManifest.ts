/** Accepted visual-screen inventory, NOT an implementation-complete list. */
export interface ScreenRecord {
  id: number;
  name: string;
  visualApproved: true;
  standaloneCodeApproved: boolean;
  integrated: false;
}

const acceptedNames = [
  "스플래시",
  "온보딩 / 튜토리얼",
  "홈 기본 화면",
  "홈 빈 상태",
  "글로벌 검색",
  "홈 편집 모드",
  "통계",
  "새 서랍 만들기",
  "서랍 칸 정하기",
  "새 서랍 칸 추가",
  "서랍 칸 수정",
  "생성 완료",
  "서랍 채우기",
  "사진 선택 / 등록 상태",
  "서랍 상세 / 보관품 목록",
  "보관품 상세",
  "보관품 수정",
  "보관품 삭제 확인",
  "사진 확대 / 보기",
  "표 보기",
  "표 보기 - 검색 상태",
  "표 보기 - 정렬 상태",
  "표 보기 - 필터 상태",
  "서랍 관리 메인",
  "이름 / 아이콘 변경",
  "서랍 칸 편집",
  "정렬 / 필터 설정",
  "서랍 삭제 확인",
  "알림 설정",
  "날짜 칸 선택",
  "알림 시점 / 시간 설정",
  "알림 완료",
  "반복 관리",
  "반복 대상 / 날짜 칸",
  "매주 / 매월 / 매년 설정",
  "반복 종료 조건",
  "반복 완료",
  "설정 홈",
  "테마 설정",
  "보안 설정",
  "잠금 설정 상세",
  "PIN 설정 / 변경",
  "앱 잠금 화면",
  "데이터 관리 허브",
  "백업 시작 / 종류 선택",
  "저장 위치 선택",
  "백업 진행",
  "백업 완료",
  "복원 파일 선택",
  "복원 내용 확인",
  "복원 진행",
  "복원 완료",
  "데이터 초기화 확인",
  "언어 설정",
  "도움말 메인",
  "FAQ",
  "사용 가이드",
  "정보",
  "피드백"
] as const;

export const screenManifest: readonly ScreenRecord[] = acceptedNames.map((name, index) => ({
  id: index + 1,
  name,
  visualApproved: true,
  standaloneCodeApproved: index !== 46,
  integrated: false,
}));
