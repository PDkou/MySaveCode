import type { FieldDef } from '../types';
import { newId } from './id';

type Translate = (key: string, variables?: Record<string, string | number>) => string;

export interface CategoryTemplate {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  buildFields: () => FieldDef[];
}

export function getCategoryTemplates(t: Translate): CategoryTemplate[] {
  return [
    {
      id: 'ledger',
      name: t('templates.ledger.name'),
      emoji: '💰',
      color: '#6F5499',
      description: t('templates.ledger.desc'),
      buildFields: () => [
        { id: newId(), name: t('templates.ledger.date'), type: 'date', required: true },
        {
          id: newId(),
          name: t('templates.ledger.kind'),
          type: 'select',
          options: [t('templates.ledger.income'), t('templates.ledger.expense')],
          required: true,
        },
        { id: newId(), name: t('templates.ledger.item'), type: 'text', required: true },
        { id: newId(), name: t('templates.ledger.amount'), type: 'currency', required: true },
        { id: newId(), name: t('templates.ledger.memo'), type: 'text', required: false },
      ],
    },
    {
      id: 'wardrobe',
      name: t('templates.wardrobe.name'),
      emoji: '👕',
      color: '#D98BA0',
      description: t('templates.wardrobe.desc'),
      buildFields: () => [
        { id: newId(), name: t('templates.wardrobe.purchaseDate'), type: 'date', required: false },
        {
          id: newId(),
          name: t('templates.wardrobe.type'),
          type: 'select',
          options: [
            t('templates.wardrobe.top'),
            t('templates.wardrobe.bottom'),
            t('templates.wardrobe.outer'),
            t('templates.wardrobe.shoes'),
            t('templates.wardrobe.other'),
          ],
          required: true,
        },
        { id: newId(), name: t('templates.wardrobe.brand'), type: 'text', required: false },
        { id: newId(), name: t('templates.wardrobe.color'), type: 'text', required: false },
        { id: newId(), name: t('templates.wardrobe.price'), type: 'currency', required: false },
      ],
    },
    {
      id: 'cosmetics',
      name: t('templates.cosmetics.name'),
      emoji: '💄',
      color: '#E0A93E',
      description: t('templates.cosmetics.desc'),
      buildFields: () => [
        { id: newId(), name: t('templates.cosmetics.product'), type: 'text', required: true },
        {
          id: newId(),
          name: t('templates.cosmetics.type'),
          type: 'select',
          options: [
            t('templates.cosmetics.skincare'),
            t('templates.cosmetics.makeup'),
            t('templates.cosmetics.hair'),
            t('templates.cosmetics.body'),
            t('templates.cosmetics.other'),
          ],
          required: true,
        },
        { id: newId(), name: t('templates.cosmetics.purchaseDate'), type: 'date', required: false },
        { id: newId(), name: t('templates.cosmetics.openDate'), type: 'date', required: false },
        { id: newId(), name: t('templates.cosmetics.price'), type: 'currency', required: false },
      ],
    },
  ];
}
