import type { Messages } from './index';

/** The short notes that appear for a moment after something was saved or deleted. */
export const feedback_toasts: Messages = {
  '보관품을 담았어요.': { ja: 'アイテムを追加しました。', en: 'Item added.' },
  '보관품을 수정했어요.': { ja: 'アイテムを更新しました。', en: 'Item updated.' },
  '보관품을 삭제했어요.': { ja: 'アイテムを削除しました。', en: 'Item deleted.' },
  '서랍을 삭제했어요.': { ja: 'ひきだしを削除しました。', en: 'Drawer deleted.' },
  '서랍 이름과 아이콘을 바꿨어요.': { ja: 'ひきだしの名前とアイコンを変更しました。', en: 'Drawer name and icon updated.' },
  '서랍 칸을 저장했어요.': { ja: '項目を保存しました。', en: 'Field saved.' },
  '서랍 칸을 삭제했어요.': { ja: '項目を削除しました。', en: 'Field deleted.' },
  '알림을 삭제했어요.': { ja: '通知を削除しました。', en: 'Notification deleted.' },
  '반복 설정을 삭제했어요.': { ja: '繰り返し設定を削除しました。', en: 'Repeat setting deleted.' },
};
