/**
 * All on-screen UI text ("chrome") in one place.
 *
 * ⚠ The `bik` strings are UNREVIEWED DRAFTS written without a native speaker.
 *   They must be checked by our Daet / Camarines Norte reviewer (Teammate 4)
 *   before the demo. Fix them here; nothing else needs to change. When they
 *   are reviewed, set EXPO_PUBLIC_UI_LANG=bik to make Bikol the default.
 *
 * Tutor ANSWERS are not translated here — they come from the backend.
 * Card labels live next to the card definitions in src/nfc/cards.ts.
 */

export type UiLang = 'en' | 'bik';

const en = {
  tagline: 'Your learning sibling',
  askTitle: 'What do you want to learn?',
  questionLabel: 'Your question',
  questionPlaceholder: 'Type any school question…',
  clearQuestion: 'Clear question',
  orPickTopic: 'Or tap a picture',
  difficultyTitle: 'How simple?',
  styleTitle: 'Who explains?',
  explainButton: 'Explain to me',
  needQuestion: 'Type a question or tap a picture first.',
  cardsButton: 'Learning cards',
  languageLabel: 'Bikol · Daet',
  languageA11y: 'Answers are in Bikol, Daet variety',

  back: 'Back',
  explanation: 'Explanation',
  example: 'Example',
  keyPoints: 'Remember',
  explainDifferently: 'Explain differently',
  listen: 'Listen',
  askAnother: 'Ask another question',
  changeHow: 'Change how I explain',
  textSmaller: 'Smaller text',
  textBigger: 'Bigger text',
  yourQuestion: 'You asked',

  thinking: 'Thinking…',
  thinkingSlow: 'Still thinking. Long answers can take a moment.',
  cancel: 'Stop',

  errorTitle: "The tutor couldn't answer",
  errorNetwork: "Can't reach the tutor. Check the internet, then try again.",
  errorTimeout: 'The tutor took too long. Let’s try again.',
  errorServer: 'The tutor had a problem. Let’s try again.',
  errorBadResponse: 'The answer came back incomplete. Let’s try again.',
  tryAgain: 'Try again',
  goBack: 'Go back',
  nothingYet: 'No question yet.',

  providerQuick: 'Answered by Amazon Quick',
  providerFallback: 'Answered by backup tutor',
  providerMock: 'Demo data · not live AI',
  providerUnknown: 'Answer source unknown',

  cardsTitle: 'Learning cards',
  cardsIntro: 'Tap a card on the back of the phone, or tap a card below.',
  traySlotTopic: 'Topic',
  traySlotLevel: 'Level',
  traySlotStyle: 'Tutor',
  trayEmpty: 'Empty',
  deckTopics: 'Topic cards',
  deckLevels: 'Level cards',
  deckStyles: 'Tutor cards',
  deckActions: 'Action cards',
  cardAdded: 'Card added',
  cardUnknown: "That card isn't a TU-gang card",
  cardNeedsTopic: 'Add a topic card first',
  cardNeedsAnswer: 'Ask a question first',

  nfcChecking: 'Checking NFC…',
  nfcReady: 'Ready! Tap a card on the back of the phone.',
  nfcScanButton: 'Scan a card',
  nfcExpoGo: 'Real NFC needs the TU-gang dev build. The cards below work the same way.',
  nfcUnsupported: 'This phone has no NFC. Use the cards below.',
  nfcDisabled: 'NFC is turned off.',
  nfcTurnOn: 'Turn on NFC',
  nfcError: 'NFC had a problem. Use the cards below.',
  nfcRetry: 'Retry',
  nfcOnShort: 'NFC on',
};

export type Copy = { [K in keyof typeof en]: string };

// DRAFT — see header. Central Bikol spellings; Daet usage not yet confirmed.
const bik: Copy = {
  tagline: 'An saimong tugang sa pag-adal',
  askTitle: 'Ano an gusto mong maaraman?',
  questionLabel: 'An saimong hapot',
  questionPlaceholder: 'Isurat digdi an saimong hapot…',
  clearQuestion: 'Hapuson an hapot',
  orPickTopic: 'O magpili nin litrato',
  difficultyTitle: 'Gurano kasimple?',
  styleTitle: 'Siisay an magpapaliwanag?',
  explainButton: 'Ipaliwanag sako',
  needQuestion: 'Magsurat nin hapot o magpili nin litrato.',
  cardsButton: 'Mga learning card',
  languageLabel: 'Bikol · Daet',
  languageA11y: 'An mga simbag sa Bikol na taga-Daet',

  back: 'Magbalik',
  explanation: 'Paliwanag',
  example: 'Halimbawa',
  keyPoints: 'Girumdumon',
  explainDifferently: 'Ibang paliwanag',
  listen: 'Dangogon',
  askAnother: 'Maghapot giraray',
  changeHow: 'Ribayan an paagi',
  textSmaller: 'Mas sadit na letra',
  textBigger: 'Mas dakula na letra',
  yourQuestion: 'An saimong hapot',

  thinking: 'Nag-iisip…',
  thinkingSlow: 'Nag-iisip pa. Medyo haloy an halaba na simbag.',
  cancel: 'Pundohon',

  errorTitle: 'Dai nakasimbag an tutor',
  errorNetwork: 'Dai maabot an tutor. Hilingon an internet, dangan probaran giraray.',
  errorTimeout: 'Naghaloy an tutor. Probaran ta giraray.',
  errorServer: 'Nagkaproblema an tutor. Probaran ta giraray.',
  errorBadResponse: 'Kulang an simbag na nag-abot. Probaran ta giraray.',
  tryAgain: 'Probaran giraray',
  goBack: 'Magbalik',
  nothingYet: 'Mayo pang hapot.',

  providerQuick: 'Simbag hale sa Amazon Quick',
  providerFallback: 'Simbag hale sa backup na tutor',
  providerMock: 'Demo data · bakong live AI',
  providerUnknown: 'Dai aram kun hain hale an simbag',

  cardsTitle: 'Mga learning card',
  cardsIntro: 'I-tap an card sa likod kan cellphone, o pinduta an card sa ibaba.',
  traySlotTopic: 'Topiko',
  traySlotLevel: 'Level',
  traySlotStyle: 'Tutor',
  trayEmpty: 'Mayo pa',
  deckTopics: 'Mga topiko',
  deckLevels: 'Gurano kasimple',
  deckStyles: 'Siisay an magpapaliwanag',
  deckActions: 'Mga aksyon',
  cardAdded: 'Nadagdag an card',
  cardUnknown: 'Bako ining TU-gang card',
  cardNeedsTopic: 'Magdagdag enot nin topiko na card',
  cardNeedsAnswer: 'Maghapot enot',

  nfcChecking: 'Hinihiling an NFC…',
  nfcReady: 'Handa na! I-tap an card sa likod kan cellphone.',
  nfcScanButton: 'Mag-scan nin card',
  nfcExpoGo: 'Kaipuhan kan TU-gang dev build an tunay na NFC. Pareho an gibo kan mga card sa ibaba.',
  nfcUnsupported: 'Mayong NFC an cellphone na ini. Gamiton an mga card sa ibaba.',
  nfcDisabled: 'Nakapatay an NFC.',
  nfcTurnOn: 'I-on an NFC',
  nfcError: 'Nagkaproblema an NFC. Gamiton an mga card sa ibaba.',
  nfcRetry: 'Probaran giraray',
  nfcOnShort: 'NFC on',
};

export const COPY: Record<UiLang, Copy> = { en, bik };
