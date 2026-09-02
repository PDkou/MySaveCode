import type { FieldDef } from '../types';
import { newId } from './id';

export interface CategoryTemplate {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  buildFields: () => FieldDef[];
}

// Starter templates for the examples the app was originally scoped around
// (household ledger / wardrobe / cosmetics). Each buildFields() call mints
// fresh field IDs so picking the same template twice for two different
// categories never lets them accidentally share a field id.
export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    id: 'ledger',
    name: '가계부',
    emoji: '💰',
    color: '#4f46e5',
    description: '날짜별 수입/지출 기록',
    buildFields: () => [
      { id: newId(), name: '날짜', type: 'date', required: true },
      { id: newId(), name: '구분', type: 'select', options: ['수입', '지출'], required: true },
      { id: newId(), name: '항목', type: 'text', required: true },
      { id: newId(), name: '금액', type: 'currency', required: true },
      { id: newId(), name: '메모', type: 'text', required: false },
    ],
  },
  {
    id: 'wardrobe',
    name: '옷장',
    emoji: '👕',
    color: '#db2777',
    description: '옷 종류, 구매일, 가격 관리',
    buildFields: () => [
      { id: newId(), name: '구매일', type: 'date', required: false },
      { id: newId(), name: '종류', type: 'select', options: ['상의', '하의', '아우터', '신발', '기타'], required: true },
      { id: newId(), name: '브랜드', type: 'text', required: false },
      { id: newId(), name: '색상', type: 'text', required: false },
      { id: newId(), name: '가격', type: 'currency', required: false },
    ],
  },
  {
    id: 'cosmetics',
    name: '화장품',
    emoji: '💄',
    color: '#d97706',
    description: '제품별 구매일, 개봉일 관리',
    buildFields: () => [
      { id: newId(), name: '제품명', type: 'text', required: true },
      { id: newId(), name: '종류', type: 'select', options: ['스킨케어', '메이크업', '헤어', '바디', '기타'], required: true },
      { id: newId(), name: '구매일', type: 'date', required: false },
      { id: newId(), name: '개봉일', type: 'date', required: false },
      { id: newId(), name: '가격', type: 'currency', required: false },
    ],
  },
];
