import { dayIndex } from './utils';

export interface HealthTip {
  topic: string;
  hi: string;
  en: string;
}

const TIPS: HealthTip[] = [
  { topic: 'Diabetes', hi: 'खाने के बाद 10 मिनट टहलने से शुगर लेवल कम रहता है।', en: 'A 10-minute walk after meals keeps sugar levels lower.' },
  { topic: 'Diabetes', hi: 'मीठे की जगह फल लीजिए — पर सीमित मात्रा में।', en: 'Choose fruit instead of sweets — in limited quantity.' },
  { topic: 'Blood Pressure', hi: 'नमक कम करें — अचार और पापड़ से परहेज़ करें।', en: 'Cut down salt — avoid pickles and papad.' },
  { topic: 'Blood Pressure', hi: 'रोज़ एक ही समय पर BP नापें, बैठ कर और आराम से।', en: 'Measure BP at the same time daily, seated and relaxed.' },
  { topic: 'Walking', hi: 'रोज़ 30 मिनट की सैर दिल को जवान रखती है।', en: 'A daily 30-minute walk keeps the heart young.' },
  { topic: 'Exercise', hi: 'हल्का योग और स्ट्रेचिंग जोड़ों के दर्द में राहत देता है।', en: 'Light yoga and stretching ease joint pain.' },
  { topic: 'Water', hi: 'दिन में 8 गिलास पानी पीने की आदत बनाएँ।', en: 'Make a habit of drinking 8 glasses of water a day.' },
  { topic: 'Sleep', hi: 'रात को 7-8 घंटे की नींद शरीर की मरम्मत करती है।', en: '7-8 hours of sleep at night repairs the body.' },
  { topic: 'Stress', hi: '5 मिनट की गहरी साँसें तनाव को आधा कर देती हैं।', en: '5 minutes of deep breathing cuts stress in half.' },
  { topic: 'Food', hi: 'रात का खाना सोने से 2 घंटे पहले खा लें।', en: 'Finish dinner 2 hours before bedtime.' },
  { topic: 'Fruits', hi: 'जामुन, अमरूद और पपीता शुगर के मरीज़ों के लिए अच्छे फल हैं।', en: 'Jamun, guava and papaya are good fruits for diabetics.' },
  { topic: 'Vegetables', hi: 'हरी पत्तेदार सब्ज़ियाँ रोज़ खाएँ — पालक, मेथी, सरसों।', en: 'Eat green leafy vegetables daily — spinach, methi, mustard greens.' },
  { topic: 'Heart Health', hi: 'तली चीज़ों की जगह भुनी या उबली चीज़ें चुनें।', en: 'Choose roasted or boiled food instead of fried.' },
  { topic: 'Heart Health', hi: 'अखरोट और बादाम दिल के दोस्त हैं — मुट्ठी भर काफ़ी है।', en: 'Walnuts and almonds are heart’s friends — a small handful is enough.' },
  { topic: 'Sleep', hi: 'सोने से पहले मोबाइल कम देखें, नींद अच्छी आएगी।', en: 'Less screen time before bed brings better sleep.' },
  { topic: 'Diabetes', hi: 'सुबह खाली पेट शुगर नापना सबसे सही रीडिंग देता है।', en: 'Fasting sugar in the morning gives the most reliable reading.' },
];

/** Deterministic daily tip; also used to seed the health_tips table. */
export function tipOfTheDay(): HealthTip {
  return TIPS[dayIndex(TIPS.length, 3)];
}

export const FOOD_GUIDE = {
  eat: ['हरी सब्ज़ियाँ (पालक, मेथी, लौकी)', 'साबुत अनाज (जौ, बाजरा, दलिया)', 'दालें और राजमा', 'जामुन, अमरूद, पपीता, सेब', 'छाछ और दही (बिना चीनी)', 'बादाम, अखरोट (मुट्ठी भर)'],
  avoid: ['चीनी, मिठाई, गुड़ ज़्यादा मात्रा में', 'तली चीज़ें — पूरी, समोसा, पकौड़े', 'सफेद चावल ज़्यादा मात्रा में', 'अचार, पापड़ (ज़्यादा नमक)', 'कोल्ड ड्रिंक और पैकेट जूस', 'मैदा — ब्रेड, नान, बिस्कुट'],
  breakfast: ['वेज दलिया या ओट्स', 'बेसन/मूंग दाल चीला', 'सब्ज़ी वाला पोहा (कम आलू)', 'अंकुरित मूंग की चाट', '1 कटोरी दही + मल्टीग्रेन टोस्ट'],
  lunch: ['2 मल्टीग्रेन रोटी + दाल + हरी सब्ज़ी', 'थोड़ा ब्राउन राइस + राजमा + सलाद', 'लौकी/तोरई की सब्ज़ी + रोटी + छाछ', 'खिचड़ी (मूंग दाल) + दही'],
  dinner: ['हल्का खाना: 1-2 रोटी + सब्ज़ी + सूप', 'वेज खिचड़ी + छाछ', 'पनीर भुर्जी (कम तेल) + रोटी', 'सोने से 2 घंटे पहले भोजन'],
  snacks: ['भुना चना', 'मुट्ठी भर बादाम/अखरोट', 'फल — अमरूद, सेब, जामुन', 'मखाना (कम घी में भुना)', 'छाछ या नींबू पानी (बिना चीनी)'],
};
