import { dayIndex } from './utils';

interface Quote {
  hi: string;
  en: string;
}

const QUOTES: Quote[] = [
  { hi: 'आज का हर छोटा स्वस्थ कदम, कल को मज़बूत बनाता है।', en: 'Every small healthy step today creates a stronger tomorrow.' },
  { hi: 'सेहत सबसे बड़ा धन है — इसे रोज़ थोड़ा-थोड़ा कमाइए।', en: 'Health is the greatest wealth — earn a little of it every day.' },
  { hi: 'दवा समय पर, चिंता दूर पर।', en: 'Medicine on time keeps worries away.' },
  { hi: 'हर सुबह एक नई शुरुआत है। मुस्कुराइए और चलिए।', en: 'Every morning is a fresh start. Smile and take a walk.' },
  { hi: 'धीरे चलिए, पर रुकिए मत।', en: 'Go slowly, but never stop.' },
  { hi: 'पानी पीते रहिए — शरीर आपको धन्यवाद देगा।', en: 'Keep drinking water — your body will thank you.' },
  { hi: 'अच्छी नींद आधी दवा है।', en: 'Good sleep is half the medicine.' },
  { hi: 'आपकी सेहत ही परिवार की सबसे बड़ी खुशी है।', en: 'Your health is the family’s greatest happiness.' },
  { hi: 'खुश रहना भी सेहत का हिस्सा है।', en: 'Staying happy is also part of staying healthy.' },
  { hi: 'थोड़ा टहलना, गहरी साँस, और भरपूर प्यार — रोज़ की खुराक।', en: 'A short walk, deep breaths and lots of love — the daily dose.' },
  { hi: 'शुगर को हराइए, मीठी यादों से जीवन भरिए।', en: 'Beat the sugar, fill life with sweet memories instead.' },
  { hi: 'हर दिन खुद से कहिए — मैं आज और बेहतर हूँ।', en: 'Tell yourself daily — I am better today.' },
  { hi: 'सब्ज़ियाँ थाली में, सेहत जीवन में।', en: 'Vegetables on the plate, health in life.' },
  { hi: 'तनाव कम, जीवन लंबा।', en: 'Less stress, longer life.' },
  { hi: 'परिवार का साथ सबसे अच्छी दवा है।', en: 'Family by your side is the best medicine.' },
];

/** Deterministic quote of the day (rotates daily, no AI call needed). */
export function quoteOfTheDay(lang: 'hi' | 'en' = 'hi'): string {
  const q = QUOTES[dayIndex(QUOTES.length)];
  return lang === 'hi' ? q.hi : q.en;
}

export function greetingForTime(tod: 'morning' | 'afternoon' | 'night', lang: 'hi' | 'en' = 'hi'): string {
  const g = {
    morning: { hi: 'सुप्रभात पापा ❤️', en: 'Good Morning Papa ❤️' },
    afternoon: { hi: 'नमस्ते पापा ❤️', en: 'Good Afternoon Papa ❤️' },
    night: { hi: 'शुभ रात्रि पापा ❤️', en: 'Good Night Papa ❤️' },
  }[tod];
  return lang === 'hi' ? g.hi : g.en;
}
