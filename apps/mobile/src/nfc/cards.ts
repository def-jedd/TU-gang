/**
 * The card deck: what each physical NFC card (and its on-screen twin) looks
 * like. Behaviour lives in cardReducer.ts; this file is only presentation.
 *
 * To make a physical card: write the `code` as an NDEF **Text** record onto an
 * NTAG213/215 sticker (e.g. with the free "NFC Tools" app), then print the
 * matching face. See apps/mobile/README.md → "Making NFC cards".
 */
import type { IconName } from '../components/Icon';
import type { UiLang } from '../i18n/copy';
import type { CardCategory } from '../theme/tokens';
import type { Difficulty, Language, TeachingStyle } from '../types/tutor';

type Localized = Record<UiLang, string>;

export type CardDef = {
  code: string;
  category: CardCategory;
  icon: IconName;
  label: Localized;
  hint?: Localized;
};

export type TopicCard = CardDef & { category: 'topic'; topic: string };
export type LevelCard = CardDef & { category: 'level'; value: Difficulty };
export type StyleCard = CardDef & { category: 'style'; value: TeachingStyle };
export type LanguageCard = CardDef & { category: 'language'; value: Language };

// Topic labels keep the English academic term on purpose (Cummins'
// interdependence: the concept is learned in Bikol, the term carries over to
// English class). The hint is the everyday version.
export const TOPIC_CARDS: TopicCard[] = [
  {
    code: 'TOPIC_PHOTOSYNTHESIS',
    category: 'topic',
    topic: 'photosynthesis',
    icon: 'sprout',
    label: { en: 'Photosynthesis', bik: 'Photosynthesis' },
    hint: { en: 'How plants make food', bik: 'Pagkakan kan tanom' },
  },
  {
    code: 'TOPIC_GRAVITY',
    category: 'topic',
    topic: 'gravity',
    icon: 'apple',
    label: { en: 'Gravity', bik: 'Gravity' },
    hint: { en: 'Why things fall', bik: 'Taano ta nahuhulog' },
  },
  {
    code: 'TOPIC_MELTING',
    category: 'topic',
    topic: 'melting',
    icon: 'snowflake-melt',
    label: { en: 'Melting', bik: 'Melting' },
    hint: { en: 'Why ice melts', bik: 'Taano ta natutunaw an yelo' },
  },
  {
    code: 'TOPIC_FRICTION',
    category: 'topic',
    topic: 'friction',
    icon: 'slope-downhill',
    label: { en: 'Friction', bik: 'Friction' },
    hint: { en: 'Why things slow down', bik: 'Taano ta naluluway' },
  },
  {
    code: 'TOPIC_FRACTIONS',
    category: 'topic',
    topic: 'fractions',
    icon: 'chart-pie',
    label: { en: 'Fractions', bik: 'Fractions' },
    hint: { en: 'Parts of a whole', bik: 'Mga parte kan sarong bilog' },
  },
];

// Signal bars show "how much" without needing to read the word.
export const LEVEL_CARDS: LevelCard[] = [
  {
    code: 'MODE_VERY_SIMPLE',
    category: 'level',
    value: 'very_simple',
    icon: 'signal-cellular-1',
    label: { en: 'Very simple', bik: 'Pinakasimple' },
  },
  {
    code: 'MODE_SIMPLE',
    category: 'level',
    value: 'simple',
    icon: 'signal-cellular-2',
    label: { en: 'Simple', bik: 'Simple' },
  },
  {
    code: 'MODE_NORMAL',
    category: 'level',
    value: 'normal',
    icon: 'signal-cellular-3',
    label: { en: 'Normal', bik: 'Normal' },
  },
];

export const STYLE_CARDS: StyleCard[] = [
  {
    code: 'STYLE_TEACHER',
    category: 'style',
    value: 'teacher',
    icon: 'human-male-board',
    label: { en: 'Teacher', bik: 'Maestra' },
  },
  {
    code: 'STYLE_FRIEND',
    category: 'style',
    value: 'friend',
    icon: 'hand-wave',
    label: { en: 'Friend', bik: 'Amigo' },
  },
  {
    // API value stays `ate_kuya`; in Bikol the older-sibling words are Manay/Manoy.
    code: 'STYLE_ATE_KUYA',
    category: 'style',
    value: 'ate_kuya',
    icon: 'account-heart',
    label: { en: 'Ate / Kuya', bik: 'Manay / Manoy' },
  },
];

export const ACTION_CARDS: CardDef[] = [
  {
    code: 'ACTION_EXPLAIN',
    category: 'action',
    icon: 'lightbulb-on',
    label: { en: 'Explain', bik: 'Ipaliwanag' },
  },
  {
    code: 'ACTION_EXPLAIN_DIFFERENTLY',
    category: 'action',
    icon: 'swap-horizontal',
    label: { en: 'Another way', bik: 'Ibang paagi' },
  },
  {
    code: 'ACTION_RESET',
    category: 'action',
    icon: 'restore',
    label: { en: 'Start over', bik: 'Puon giraray' },
  },
];

export const LANGUAGE_CARDS: LanguageCard[] = [
  {
    code: 'LANG_BIKOL_DAET',
    category: 'language',
    value: 'bikol_daet',
    icon: 'map-marker-radius',
    label: { en: 'Bikol', bik: 'Bikol' },
  },
  {
    code: 'LANG_TAGALOG', category: 'language', value: 'tagalog',
    icon: 'translate', label: { en: 'Tagalog', bik: 'Tagalog' },
  },
  {
    code: 'LANG_ENGLISH', category: 'language', value: 'english',
    icon: 'translate', label: { en: 'English', bik: 'English' },
  },
];

export const ALL_CARDS: CardDef[] = [
  ...TOPIC_CARDS,
  ...LEVEL_CARDS,
  ...STYLE_CARDS,
  ...ACTION_CARDS,
  ...LANGUAGE_CARDS,
];

export function topicCard(topic: string | null): TopicCard | undefined {
  return topic ? TOPIC_CARDS.find((card) => card.topic === topic) : undefined;
}

/**
 * Optional: map a blank tag's factory UID (hex, as react-native-nfc-manager
 * reports it) to a card code. Lets you use cards you cannot write to.
 * Example: '04A2B3C4D5E680': 'TOPIC_GRAVITY'
 */
export const UID_TO_CARD: Record<string, string> = {};
