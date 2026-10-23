import { backup_data } from './backup_data';
import { core } from './core';
import { help_pages } from './help_pages';
import { rest } from './rest';
import { settings_flows } from './settings_flows';
import { templates } from './templates';
import { premium } from './premium';
import { feedback_toasts } from './feedback_toasts';

export type Entry = { ja: string; en: string };
export type Messages = Record<string, Entry>;

/** One file per area (messages/*.ts); the Korean text is the key. */
export const SOURCES: Record<string, Messages> = { backup_data, core, help_pages, rest, settings_flows, templates, premium, feedback_toasts };

export const MESSAGES: Messages = Object.assign({}, ...Object.values(SOURCES));
