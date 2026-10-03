/**
 * Offline stand-in for POST /api/explain so the UI can be built and rehearsed
 * before the backend exists.
 *
 * ⚠ The Bikol below is an UNREVIEWED AI-written draft used only to test
 *   layout with realistic word lengths. It is NOT native-reviewed and must
 *   never be presented as a live answer — every response is `provider: 'mock'`,
 *   which the UI labels "Demo data · not live AI".
 *   Replace with Teammate 4's reviewed samples when they arrive.
 *
 * QA hooks — include these words in a question:
 *   "test slow"  → answers after 12 s (tests the slow-loading state)
 *   "test error" → fails like a dropped connection (tests error + retry)
 */
import type { Difficulty, ExplainRequest, ExplainResponse, TeachingStyle } from '../types/tutor';
import { TutorError } from './errors';

type Lesson = {
  explanation: Partial<Record<Difficulty, string>> & { simple: string };
  /** Used for action = explain_differently. */
  alternate?: string;
  example: string;
  alternateExample?: string;
  keyPoints: [string, string, string];
};

const LESSONS: Record<string, Lesson> = {
  melting: {
    explanation: {
      very_simple:
        'An yelo iyo an tubig na nagin matagas huli ta malipot na marhay. Kun nainitan an yelo, nagigin tubig giraray. Iyan an pagtunaw.',
      simple:
        'An yelo iyo an tubig na nagyelo. Kun an yelo nakakaresibi nin init hale sa hangin o sa saldang, an saiyang porma nagbabago. Hinay-hinay siyang nagigin tubig. Iyan an inaapod na melting o pagtunaw.',
      normal:
        'An yelo iyo an solidong porma kan tubig. Sa laog kan yelo, an mga molecule kan tubig magkadugtong asin dai gaanong naggagaralaw.\n\nKun an yelo nakakaresibi nin init hale sa palibot (halimbawa sa hangin o sa saimong kamot), an mga molecule nagkakaigwa nin dugang na energy. Mas makusog sinda naggagaralaw sagkod na mabuhian an saindang pagkakadugtong. Kaya an solido nagigin liquid. Ini an inaapod na melting, asin nangyayari ini sa 0°C.',
    },
    alternate:
      'Isipon mo an mga aki na magkakakapot an kamot sa sarong bilog. Kun malipot, dai sinda naggagaralaw, kaya matagas an yelo. Kun mainit na, nagkakakulog sinda asin nabubuhian an kapot. Iyo man ini an nangyayari sa tubig sa laog kan yelo.',
    example:
      'Ibutang mo an sarong yelo sa lamesa sa luwas kan harong. Pakalihis nin pirang minuto, tubig na sana an matatada.',
    alternateExample:
      'An yelo sa saimong palamig na inumon, sa kahaloyan, nawawara asin nagigin kabtang kan inumon.',
    keyPoints: [
      'An yelo iyo an tubig na nagyelo.',
      'An init an nagpapatunaw sa yelo.',
      'Pag natunaw, tubig giraray an yelo.',
    ],
  },
  photosynthesis: {
    explanation: {
      simple:
        'An photosynthesis iyo an paagi kan mga tanom sa paggibo kan saindang sadiring pagkakan. Ginagamit ninda an liwanag kan saldang, an tubig na hale sa daga, asin an carbon dioxide na hale sa hangin. An resulta: asukar na pagkakan kan tanom, asin oxygen na hinahangos ta.',
      normal:
        'An photosynthesis iyo an proseso na ginagamit kan mga tanom tanganing gibohon an saindang pagkakan. Sa laog kan dahon igwa nin chlorophyll, an berdeng bagay na nagkakapot kan liwanag kan saldang.\n\nGamit an energy kan saldang, pinagsasararo kan tanom an tubig hale sa gamot asin an carbon dioxide hale sa hangin tanganing gumibo nin glucose. An oxygen iyo an natatada, asin iyo ini an hinahangos kan mga tawo asin hayop.',
    },
    example:
      'Hilingon mo an mga dahon kan kamote sa likod kan harong. Kun pirmi sindang nasisirangan kan saldang, berde asin marhay an saindang pagtubo.',
    keyPoints: [
      'Kaipuhan kan tanom an saldang, tubig, asin hangin.',
      'Sa dahon nangyayari an photosynthesis.',
      'Naggigibo an tanom nin pagkakan asin oxygen.',
    ],
  },
  gravity: {
    explanation: {
      simple:
        'An gravity iyo an pwersa na nagguguyod sa gabos na bagay pasiring sa daga. Kaya kun bitawan mo an bola, nahuhulog iyan pababa, bako pataas.',
    },
    example: 'Kun an sarong niyog magbulos sa puno, diretso iyan na nahuhulog sa daga.',
    keyPoints: [
      'An gravity nagguguyod pasiring sa daga.',
      'Huli kaini, nahuhulog an mga bagay.',
      'Igwa nin gravity an gabos na planeta.',
    ],
  },
  friction: {
    explanation: {
      simple:
        'An friction iyo an pwersa na nagpapaluway sa naggagaralaw na bagay kun nagkikiskisan an duwang ibabaw. Mas magaspang an ibabaw, mas dakula an friction.',
    },
    example:
      'Kun ipadausdos mo an tsinelas sa semento, madali iyan na mapundo. Pero sa basang sahig, mas harayo an aabuton kaiyan.',
    keyPoints: [
      'An friction nagpapaluway sa paggalaw.',
      'Mas magaspang an ibabaw, mas dakula an friction.',
      'Huli sa friction, nakakalakaw kita na dai nadudulas.',
    ],
  },
  fractions: {
    explanation: {
      simple:
        'An fraction iyo an parte kan sarong bilog na bagay. Kun an sarong pizza pinarte sa duwang parehong kadakula, an lambang parte iyo an one-half o 1/2.',
    },
    example:
      'Kun igwa ka nin sarong pandesal asin itinao mo an kabanga sa saimong tugang, pareho kamong igwa nin 1/2.',
    keyPoints: [
      'An fraction parte kan sarong bilog.',
      'An ibaba na numero: pira an gabos na parte.',
      'An itaas na numero: pira an saimong kinua.',
    ],
  },
};

const KEYWORDS: [RegExp, string][] = [
  [/ice|melt|yelo|tunaw/i, 'melting'],
  [/plant|photosynth|tanom|halaman/i, 'photosynthesis'],
  [/fall|gravity|hulog/i, 'gravity'],
  [/friction|slow|luway|bagal/i, 'friction'],
  [/fraction|half|kabanga|kalahati/i, 'fractions'],
];

const OPENERS: Record<TeachingStyle, string> = {
  teacher: '',
  friend: 'Uy! ',
  ate_kuya: 'Hali ka, tugang. ',
};

function pickTopic(request: ExplainRequest): string | null {
  if (request.topic && LESSONS[request.topic]) return request.topic;
  return KEYWORDS.find(([pattern]) => pattern.test(request.question))?.[1] ?? null;
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new TutorError('cancelled', 'Cancelled'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new TutorError('cancelled', 'Cancelled'));
    });
  });
}

export async function mockExplain(request: ExplainRequest, signal?: AbortSignal): Promise<ExplainResponse> {
  const question = request.question.toLowerCase();
  await wait(question.includes('test slow') ? 12_000 : 900 + Math.random() * 700, signal);
  if (question.includes('test error')) {
    throw new TutorError('network', 'Simulated network failure (mock "test error")');
  }

  const topic = pickTopic(request);
  const lesson = topic ? LESSONS[topic] : null;
  const differently = request.action === 'explain_differently';
  const opener = OPENERS[request.style];

  if (!lesson) {
    return {
      request_id: `mock-${Date.now().toString(36)}`,
      topic: request.topic,
      language: request.language,
      explanation:
        `${opener}(Mock na simbag) Dai pa konektado an tunay na tutor. ` +
        `Kun konektado na, an paliwanag sa Bikol para sa “${request.question}” an maluwas digdi.`,
      example: 'Digdi maluwas an sarong halimbawa na pamilyar sa mga taga-Daet.',
      key_points: [
        'Ini sarong demo na simbag.',
        'Ikonektar an backend para sa tunay na paliwanag.',
        'Magsurat nin hapot o mag-tap nin card.',
      ],
      source_ids: [],
      provider: 'mock',
    };
  }

  const base = lesson.explanation[request.difficulty] ?? lesson.explanation.simple;
  const explanation = differently && lesson.alternate ? lesson.alternate : base;

  return {
    request_id: `mock-${Date.now().toString(36)}`,
    topic,
    language: request.language,
    explanation: opener + explanation,
    example: differently && lesson.alternateExample ? lesson.alternateExample : lesson.example,
    key_points: [...lesson.keyPoints],
    source_ids: [],
    provider: 'mock',
  };
}
