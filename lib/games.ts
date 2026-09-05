import type { GameId } from "./content/types";

export type Mood = "talk" | "laugh" | "challenge" | "activity";

export interface GameMeta {
  id: GameId;
  slug: string;
  name: string; // Arabic
  tagline: string; // one line, Arabic
  why: string; // why play, 1–2 sentences
  steps: [string, string, string]; // instructions in 3 short steps
  minutes: number; // typical session length
  rounds: readonly number[]; // selectable round counts; [] = fixed/n.a.
  fixedRounds?: number; // G04 = 10, G09 = 5, G25 = 1
  depth: "light" | "deep" | "mixed";
  moods: Mood[];
  requiresTools: boolean; // any card may require tools
  requiresMovement: boolean; // any card may require movement
  devices: 1;
  hue: string; // per-game accent (CSS color) — identity, used on cards/chips
}

export const GAMES: readonly GameMeta[] = [
  {
    id: "G01",
    slug: "conversation-starters",
    name: "فاتحة حديث",
    tagline: "أسئلة قصيرة تفتح كلاماً طويلاً",
    why: "لأن أجمل الأحاديث تبدأ بسؤال بسيط. كل بطاقة سؤال، وكل جواب يُقال بصوتكما لا بأصابعكما.",
    steps: [
      "اختارا الباقة وعدد البطاقات",
      "اقرأ السؤال بصوت عالٍ وأجب",
      "مرّر الهاتف؛ الدور على شريكك",
    ],
    minutes: 10,
    rounds: [5, 10],
    depth: "mixed",
    moods: ["talk"],
    requiresTools: false,
    requiresMovement: false,
    devices: 1,
    hue: "#7A5AF8",
  },
  {
    id: "G02",
    slug: "would-you-rather",
    name: "أيّهما تختار؟",
    tagline: "خياران فقط، وتوقّع اختيار شريكك",
    why: "لعبة سريعة تكشف كم تتشابهان في الصغائر، وتضحككما حين تختلفان.",
    steps: ["اختر أحد الخيارَين وثبّت", "مرّر الهاتف ليختار شريكك", "شاهدا اختياريكما معاً"],
    minutes: 8,
    rounds: [5, 10],
    depth: "light",
    moods: ["laugh", "talk"],
    requiresTools: false,
    requiresMovement: false,
    devices: 1,
    hue: "#F0A23B",
  },
  {
    id: "G03",
    slug: "which-one-of-us",
    name: "مَن منّا؟",
    tagline: "أنت؟ أنا؟ أم كلانا؟",
    why: "مواقف يومية صغيرة تُظهر كيف يرى كلٌّ منكما الآخر، بلا أحكام.",
    steps: [
      "اقرأ العبارة واختر: أنت، شريكك، أو كلاكما",
      "مرّر الهاتف ليختار شريكك",
      "قارنا الإجابتين",
    ],
    minutes: 8,
    rounds: [5, 10],
    depth: "light",
    moods: ["laugh"],
    requiresTools: false,
    requiresMovement: false,
    devices: 1,
    hue: "#D9647A",
  },
  {
    id: "G04",
    slug: "how-well-do-you-know-me",
    name: "كم تعرفني؟",
    tagline: "أحدكما يجيب، والآخر يتوقّع",
    why: "عشر جولات، خمس لكلٍّ منكما. نقطة لكل توقّع صحيح، ولا أحكام على من يخطئ.",
    steps: [
      "يجيب أحدكما عن نفسه سراً",
      "مرّر الهاتف ليتوقّع الآخر",
      "نقطة للتوقّع الصحيح، ثم تبادلا الأدوار",
    ],
    minutes: 12,
    rounds: [],
    fixedRounds: 10,
    depth: "light",
    moods: ["challenge", "talk"],
    requiresTools: false,
    requiresMovement: false,
    devices: 1,
    hue: "#2F9E8F",
  },
  {
    id: "G09",
    slug: "one-minute-challenges",
    name: "تحدّي الدقيقة",
    tagline: "خمس مهمات صغيرة، معاً ضد الساعة",
    why: "تحديات تعاونية خفيفة: تمثيل، كلام، حركة بسيطة. تنجحان معاً أو تضحكان معاً.",
    steps: [
      "اقرآ التحدّي معاً",
      "اضغطا «مستعدّان» لبدء المؤقّت",
      "عند انتهاء الوقت قرّرا: أنجزناه أم نتخطّاه",
    ],
    minutes: 7,
    rounds: [],
    fixedRounds: 5,
    depth: "light",
    moods: ["challenge", "laugh"],
    requiresTools: true,
    requiresMovement: true,
    devices: 1,
    hue: "#E8663D",
  },
  {
    id: "G25",
    slug: "what-shall-we-do",
    name: "عجلة الونس",
    tagline: "حين لا تعرفان ماذا تفعلان",
    why: "أربعون نشاطاً مرتّباً حسب المكان والتكلفة والوقت. أديرا العجلة واتركا القرار للحظّ.",
    steps: ["حدّدا المكان والتكلفة والوقت", "أديرا العجلة", "خيار آخر؟ أديراها مرة أخرى"],
    minutes: 5,
    rounds: [],
    fixedRounds: 1,
    depth: "light",
    moods: ["activity"],
    requiresTools: true,
    requiresMovement: true,
    devices: 1,
    hue: "#3B82F6",
  },
] as const;

export const gameBySlug = (slug: string) => GAMES.find((g) => g.slug === slug);
export const gameById = (id: string) => GAMES.find((g) => g.id === id);

export const MOOD_LABEL: Record<Mood, string> = {
  talk: "نتكلّم",
  laugh: "نضحك",
  challenge: "نتحدّى",
  activity: "نختار نشاطاً",
};
