import type { FieldKind } from '../data/types';
import type { DraftField } from './drawerDraft';
import { K, t } from '../i18n';

/** A ready-made drawer: name, look and fields in one tap ("템플릿으로 시작"). It fills the create-drawer flow, which the person can still change. */
export interface DrawerTemplate {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  colorKey: string;
  fields: ReadonlyArray<{ name: string; kind: FieldKind; options?: readonly string[] }>;
}

export const DRAWER_TEMPLATES: readonly DrawerTemplate[] = [
  { id: 'fav-goods', name: K('최애 굿즈'), description: K('앨범, 포토카드, 굿즈를 모아요'), iconKey: 'gifts', colorKey: 'lavender', fields: [
    { name: K('굿즈 이름'), kind: 'text' }, { name: K('최애 그룹'), kind: 'text' },
    { name: K('종류'), kind: 'select', options: [K('앨범'), K('포토카드'), K('키링'), K('의류'), K('기타')] },
    { name: K('구매일'), kind: 'date' }, { name: K('가격'), kind: 'currency' }, { name: K('수량'), kind: 'number' }, { name: K('사진'), kind: 'photo' } ] },
  { id: 'cosmetics', name: K('화장품'), description: K('사용 기한과 후기를 기록해요'), iconKey: 'cosmetics', colorKey: 'pink', fields: [
    { name: K('제품명'), kind: 'text' }, { name: K('브랜드'), kind: 'text' },
    { name: K('종류'), kind: 'select', options: [K('스킨케어'), K('베이스'), K('색조'), K('헤어와 바디'), K('기타')] },
    { name: K('구매일'), kind: 'date' }, { name: K('사용기한'), kind: 'date' }, { name: K('가격'), kind: 'currency' },
    { name: K('별점'), kind: 'rating' }, { name: K('한줄평'), kind: 'text' } ] },
  { id: 'books', name: K('읽은 책'), description: K('읽은 날과 한 줄 감상을 남겨요'), iconKey: 'books', colorKey: 'blue', fields: [
    { name: K('제목'), kind: 'text' }, { name: K('저자'), kind: 'text' }, { name: K('읽은 날'), kind: 'date' },
    { name: K('별점'), kind: 'rating' }, { name: K('한줄평'), kind: 'text' }, { name: K('사진'), kind: 'photo' } ] },
  { id: 'movies', name: K('영화와 드라마'), description: K('본 작품과 별점을 모아요'), iconKey: 'movies', colorKey: 'peach', fields: [
    { name: K('제목'), kind: 'text' }, { name: K('종류'), kind: 'select', options: [K('영화'), K('드라마'), K('애니메이션'), K('다큐멘터리')] },
    { name: K('본 날'), kind: 'date' }, { name: K('별점'), kind: 'rating' }, { name: K('한줄평'), kind: 'text' } ] },
  { id: 'cafe', name: K('카페와 맛집'), description: K('다녀온 가게를 기억해요'), iconKey: 'cafe', colorKey: 'peach', fields: [
    { name: K('가게 이름'), kind: 'text' }, { name: K('종류'), kind: 'select', options: [K('카페'), K('식당'), K('빵집'), K('술집'), K('기타')] },
    { name: K('간 날'), kind: 'date' }, { name: K('가격'), kind: 'currency' }, { name: K('별점'), kind: 'rating' },
    { name: K('링크'), kind: 'link' }, { name: K('메모'), kind: 'long_text' } ] },
  { id: 'plants', name: K('식물'), description: K('물 준 날과 상태를 챙겨요'), iconKey: 'plants', colorKey: 'green', fields: [
    { name: K('식물 이름'), kind: 'text' }, { name: K('들인 날'), kind: 'date' }, { name: K('물 준 날'), kind: 'date' },
    { name: K('상태'), kind: 'select', options: [K('건강해요'), K('시들었어요'), K('분갈이가 필요해요')] },
    { name: K('가격'), kind: 'currency' }, { name: K('사진'), kind: 'photo' } ] },
  { id: 'travel', name: K('여행 기록'), description: K('다녀온 곳과 경비를 남겨요'), iconKey: 'travel', colorKey: 'blue', fields: [
    { name: K('장소'), kind: 'text' }, { name: K('여행 날'), kind: 'date' }, { name: K('경비'), kind: 'currency' },
    { name: K('함께한 사람'), kind: 'text' }, { name: K('별점'), kind: 'rating' }, { name: K('링크'), kind: 'link' }, { name: K('사진'), kind: 'photo' } ] },
  { id: 'games-music', name: K('게임과 음반'), description: K('모은 게임과 음반을 정리해요'), iconKey: 'games', colorKey: 'lavender', fields: [
    { name: K('제목'), kind: 'text' }, { name: K('종류'), kind: 'select', options: [K('게임'), K('앨범'), K('굿즈'), K('기타')] },
    { name: K('플랫폼과 형태'), kind: 'text' }, { name: K('구매일'), kind: 'date' }, { name: K('가격'), kind: 'currency' }, { name: K('별점'), kind: 'rating' } ] },
  { id: 'budget', name: K('가계부'), description: K('쓴 돈과 받은 돈을 적어요'), iconKey: 'finance', colorKey: 'yellow', fields: [
    { name: K('내용'), kind: 'text' }, { name: K('날짜'), kind: 'date' }, { name: K('금액'), kind: 'currency' },
    { name: K('구분'), kind: 'select', options: [K('지출'), K('수입')] },
    { name: K('분류'), kind: 'select', options: [K('식비'), K('교통'), K('쇼핑'), K('생활'), K('문화'), K('기타')] },
    { name: K('결제 수단'), kind: 'select', options: [K('카드'), K('현금'), K('계좌이체'), K('기타')] }, { name: K('메모'), kind: 'text' } ] },
];

/** The fields of a template as the create-drawer flow keeps them (translated into the current language). */
export function draftFieldsOf(template: DrawerTemplate): DraftField[] {
  return template.fields.map((f, i) => ({
    id: `draft-template-${template.id}-${i}`,
    name: t(f.name),
    kind: f.kind,
    required: false,
    options: (f.options ?? []).map((o) => t(o)),
  }));
}
