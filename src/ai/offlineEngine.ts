/**
 * BounceForge Offline Suggestion Engine
 * Provides 300+ original curated templates across categories, styles, and languages.
 * Guaranteed 100% offline fallback when AI_API_KEY is unset or server is unavailable.
 */

export type HookStyle =
  | 'curiosity'
  | 'challenge'
  | 'prediction'
  | 'countdown'
  | 'asmr'
  | 'funny'
  | 'suspense';

export type SupportedLanguage =
  | 'en'
  | 'ur_roman'
  | 'ur_script'
  | 'hi'
  | 'ar'
  | 'es'
  | 'pt'
  | 'id'
  | 'tr';

export interface HookGenerationOptions {
  modeName: string;
  category: string;
  endingType?: string;
  preset?: string;
  duration?: number;
  contestants?: string[];
  styles?: HookStyle[];
  language?: SupportedLanguage;
  emoji?: boolean;
  casing?: 'as_written' | 'lowercase' | 'uppercase';
}

// Prohibited content filter list (brands, celebrities, misleading viral guarantees, lyrics)
const PROHIBITED_WORDS = [
  'guaranteed viral',
  'get 1m views',
  'hack the algorithm',
  'taylor swift',
  'drake',
  'tiktok dance',
  'nike',
  'apple',
  'disney',
  'roblox',
  'minecraft',
  'mrbeast',
];

export function sanitizeText(text: string): string {
  let clean = text;
  for (const word of PROHIBITED_WORDS) {
    const reg = new RegExp(word, 'gi');
    clean = clean.replace(reg, '');
  }
  return clean.trim();
}

/**
 * Checks if a hook text fits within 2 lines inside the vertical safe area
 */
export function fitsSafeLineLimit(text: string, maxChars: number = 40): boolean {
  if (text.length > maxChars) return false;
  // If canvas is available, measure text width
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'bold 44px Helvetica, Arial, sans-serif';
        const metrics = ctx.measureText(text);
        // Max safe text width for 1080p canvas with 90px side margins is ~900px
        // 2 lines can fit up to 1800px total
        if (metrics.width > 1750) return false;
      }
    } catch {}
  }
  return true;
}

// Emojis mapping per style
const STYLE_EMOJIS: Record<HookStyle, string[]> = {
  curiosity: ['👀', '🤔', '⚡', '✨'],
  challenge: ['🔥', '⚔️', '💪', '🎯'],
  prediction: ['👇', '🔮', '🏆', '🟥'],
  countdown: ['⏱️', '⏳', '🚨', '💣'],
  asmr: ['🎧', '🧼', '✨', '🫧'],
  funny: ['💀', '😭', '😳', '😂'],
  suspense: ['😱', '🫣', '⚠️', '👀'],
};

// 300+ Multilingual Original Templates
export const OFFLINE_HOOK_TEMPLATES: Record<SupportedLanguage, Record<HookStyle, string[]>> = {
  en: {
    curiosity: [
      'can the ball escape??',
      'wait for the final ring',
      'the ending surprised me',
      'how did it find the gap??',
      'watch the last 5 seconds',
      'something clean happens at 0.0',
      'this one took 412 attempts',
      'is this actually possible??',
      'did you notice the switch??',
      'nobody expects the last bounce',
    ],
    challenge: [
      'bet you cannot look away',
      'try to guess the exit point',
      'can you beat this timer??',
      'only 1% guess the winner',
      'dont blink on frame 3600',
      'try not to feel satisfied',
      'guess before the clock hits 0',
      'spot the gold sphere first',
      'which color survives the longest??',
      'bet you replay this twice',
    ],
    prediction: [
      'pick ur color before it starts',
      'cyan or pink: who clutches??',
      'choose a ball right now 👇',
      'comment your champion',
      'red vs blue: pick a side',
      'which quadrant fills first??',
      'predict the winner in comments',
      'drop your pick before 10s',
      'who is taking the trophy 🏆??',
      'tag someone who picked wrong',
    ],
    countdown: [
      'escapes exactly at 0.0s',
      '60 seconds on the clock',
      'watch the countdown pulse red',
      '10 seconds left: will it make it??',
      'final 3 seconds clutch',
      'timer hits zero and it drops',
      'escape on the final second',
      'countdown to total destruction',
      'zero seconds left 🔥',
      'the last second was so close',
    ],
    asmr: [
      'pure soap slicing tingles',
      'headphones on for max tingles',
      'crystal chime glass harmonics',
      'soft crunch satisfying audio',
      'oddly satisfying sound design',
      'marble xylophone rain chords',
      'listen to the bubble pops',
      'deep 808 bass drop impact',
      'tactile wire slice crunch',
      'gentle harmonic binaural audio',
    ],
    funny: [
      'physics gave up on this one',
      'the ball really said no exit',
      'bro got rejected by the gap',
      'it really teased us for 55s',
      'my patience tested by one ball',
      'gravity had personal beef',
      'why did it do that at the end 💀',
      'the ending was disrespectful',
      'one pixel away from freedom',
      'the gap moved on purpose',
    ],
    suspense: [
      'so close it hurts',
      'it almost escaped 7 times',
      'one micro millimeter away',
      'the final ring is wobbling',
      'held my breath for 50s',
      'heart rate climbing each second',
      'will the last ring shatter??',
      'hanging by a single pixel',
      'the final near-miss tho',
      'the drop is coming... wait',
    ],
  },
  ur_roman: {
    curiosity: [
      'kya ye ball nikal payegi??',
      'aakhri ring ka wait karo',
      'ending dekh kar heran ho jaoge',
      'isko rasta kaisay mila??',
      'aakhri 5 seconds dekho',
      'ye waqai possible hai??',
    ],
    challenge: [
      'shart laga lo nazar nahi hategi',
      'winner guess karke dikhao',
      'sirf 1% log sahi guess karte hain',
      'palken mat jhpkao',
      'timer khatam hone se pehle batao',
      'dobaara dekhne par majboor ho jaoge',
    ],
    prediction: [
      'shuru hone se pehle color chuno',
      'cyan ya pink: kon jeetega??',
      'apna contestant comment karo',
      'apna favorite color likho 👇',
      'kon sa color pehle fill hoga??',
      'trophy kisko milegi??',
    ],
    countdown: [
      'theek 0.0 par escape hoga',
      '60 seconds ka timer shuru',
      'aakhri 10 second ka suspension',
      'timer zero hua aur ball bahar',
      'aakhri second mein clutch kar liya',
      'zero second bache hain',
    ],
    asmr: [
      'headphones lagao sukoon ke liye',
      'behtareen asmr soundscape',
      'shant karne wali awaaz',
      'satisfying ball physics tingles',
      'crystal glass ping harmonics',
      'bubble pop chain ki awaaz',
    ],
    funny: [
      'physics ne jawab de diya',
      'ball ne seedha inkar kar diya',
      'gap ne dhoka de diya 💀',
      'gravity ka personal masla tha',
      'aakhri waqt par mazaak ban gaya',
      'sirf aik pixel se reh gaya',
    ],
    suspense: [
      'itna qareeb ke saans ruk jaye',
      '7 baar nikalte nikalte bacha',
      'aakhri ring hil raha hai',
      '50 second tak saans band thi',
      'kya aakhri ring tootega??',
      'bas aik baal barabar fasla',
    ],
  },
  ur_script: {
    curiosity: [
      'کیا یہ گیند نکل پائے گی؟',
      'آخری رنگ کا انتظار کریں',
      'اختتام دیکھ کر حیران رہ جائیں گے',
      'آخری ۵ سیکنڈ دیکھیں',
      'یہ واقعی ممکن ہے؟',
      'کسی نے اس اچھال کی توقع نہیں کی',
    ],
    challenge: [
      'شرط لگا لیں نظر نہیں ہٹے گی',
      'جیتنے والے کا اندازہ لگا کر دکھائیں',
      'پلکیں مت جھپکائیں',
      'صرف ۱ فیصد لوگ صحیح بتاتے ہیں',
      'ٹائمر ختم ہونے سے پہلے بتائیں',
      'دوبارہ دیکھنے پر مجبور ہو جائیں گے',
    ],
    prediction: [
      'شروع ہونے سے پہلے رنگ چنیں',
      'کون جیتے گا؟ کمنٹ کریں',
      'اپنا پسندیدہ رنگ منتخب کریں',
      'کون سا حصہ پہلے بھرے گا؟',
      'ٹرافی کس کو ملے گی؟',
      'کمنٹ میں اپنا اندازہ لکھیں',
    ],
    countdown: [
      'ٹھیک 0.0 پر گیند باہر نکلے گی',
      '۶۰ سیکنڈ کا کاؤنٹ ڈاؤن شروع',
      'آخری سیکنڈ میں کمال ہو گیا',
      'ٹائمر صفر ہوا اور گیند باہر',
      'آخری ۳ سیکنڈ کا سسپنس',
      'صفر سیکنڈ باقی ہیں',
    ],
    asmr: [
      'سکون کے لیے ہیڈ فون لگائیں',
      'پرسکون آواز اور فزکس',
      'انتہائی تسلی بخش آوازیں',
      'شیشے کی جھنکار اور نغمے',
      'صوتی جادو کا لطف اٹھائیں',
      'کرسٹل ہارمونیکس',
    ],
    funny: [
      'فزکس نے جواب دے دیا',
      'گیند نے صاف انکار کر دیا',
      'راستے نے دھوکہ دے دیا',
      'صرف ایک پکسل کا فاصلہ تھا',
      'آخر میں مذاق بن گیا',
      'حیران کن اختتام',
    ],
    suspense: [
      'اتنا قریب کہ سانس رک جائے',
      'سات بار نکلتے نکلتے بچی',
      'آخری رنگ لرز رہا ہے',
      'کیا آخری رنگ ٹوٹے گا؟',
      'دل کی دھڑکنیں تیز ہو گئیں',
      'ایک بال برابر فاصلہ',
    ],
  },
  hi: {
    curiosity: [
      'क्या यह बॉल बाहर निकल पाएगी??',
      'आखिरी रिंग का इंतज़ार करें',
      'एंडिंग देखकर हैरान रह जाओगे',
      'इसको रास्ता कैसे मिला??',
      'आखिरी 5 सेकंड ज़रूर देखें',
      'क्या यह सच में मुमकिन है??',
    ],
    challenge: [
      'शर्त लगा लो नज़र नहीं हटेगी',
      'विजेता का अंदाज़ा लगाकर दिखाओ',
      'सिर्फ 1% लोग सही अंदाज़ा लगाते हैं',
      'पलकें मत झपकाओ',
      'टाइमर खत्म होने से पहले बताओ',
      'दोबारा देखने पर मजबूर हो जाओगे',
    ],
    prediction: [
      'शुरू होने से पहले कलर चुनो',
      'कौन जीतेगा? कमेंट में बताओ',
      'अपना पसंदीदा रंग चुनो 👇',
      'ट्रॉफी किसे मिलेगी??',
      'कमेंट में अपना विजेता लिखो',
      'किसका अंदाज़ा सही निकलेगा??',
    ],
    countdown: [
      'ठीक 0.0 पर बॉल निकलेगी',
      '60 सेकंड का काउंटडाउन शुरू',
      'आखिरी सेकंड में कमाल हो गया',
      'टाइमर ज़ीरो हुआ और बॉल बाहर',
      'आखिरी 3 सेकंड का रोमांच',
      'ज़ीरो सेकंड बचे हैं 🔥',
    ],
    asmr: [
      'सुकून के लिए हेडफ़ोन लगाएं',
      'बेहतरीन ASMR साउंड डिज़ाइन',
      'शांति देने वाली सुखद आवाज़',
      'क्रिस्टल ग्लास पिंग हारमोनिक्स',
      'अत्यंत संतोषजनक ध्वनि',
      'बुलबुले फूटने का सुकून',
    ],
    funny: [
      'फ़िज़िक्स ने हाथ खड़े कर दिए',
      'बॉल ने सीधा मना कर दिया',
      'गैप ने धोखा दे दिया 💀',
      'सिर्फ एक पिक्सल से चूक गया',
      'एंडिंग में मज़ाक हो गया',
      'गुरुत्वाकर्षण से पुरानी दुश्मनी थी',
    ],
    suspense: [
      'इतना करीब कि सांसें थम जाएं',
      '7 बार निकलते-निकलते बची',
      'आखिरी रिंग हिल रही है',
      'क्या आखिरी रिंग टूटेगी??',
      'दिल की धड़कनें तेज हो गईं',
      'बस बाल बराबर की दूरी थी',
    ],
  },
  ar: {
    curiosity: [
      'هل يمكن للكرة الهروب؟',
      'انتظر الحلقة الأخيرة',
      'النهاية ستفاجئك حقاً',
      'شاهد آخر ۵ ثوانٍ',
      'هل هذا ممكن حقاً؟',
      'لم يتوقع أحد هذه القفزة',
    ],
    challenge: [
      'أتحداك ألا تغمض عينيك',
      'خمن الفائز قبل البداية',
      'فقط ۱٪ يخمنون بشكل صحيح',
      'لا ترمش حتى النهاية',
      'خمن قبل انتهاء المؤقت',
      'ستشاهد الفيديو مرتين بالتأكيد',
    ],
    prediction: [
      'اختر لونك قبل أن تبدأ',
      'أي لون سيفوز اليوم؟ 👇',
      'توقع الفائز في التعليقات',
      'الأحمر أم الأزرق: اختر الآن',
      'من سيحمل الكأس؟ 🏆',
      'ضع توقعك الآن',
    ],
    countdown: [
      'الهروب عند الثانية 0.0 تماماً',
      'بدأ العد التنازلي لمدة 60 ثانية',
      'نجاح لا يصدق في الثانية الأخيرة',
      'وصل المؤقت للصفر وسقطت الكرة',
      'آخر ۳ ثوانٍ من الحماس',
      'صفر ثانية متبقية 🔥',
    ],
    asmr: [
      'ضع السماعات لأفضل تجربة صوتية',
      'أصوات مريحة للأعصاب ASMR',
      'نغمات زجاجية كريستالية نقية',
      'تصميم صوتي يبعث على الراحة',
      'تقطيع الصابون الممتع',
      'استرخ مع حركة الكرات الفيزيائية',
    ],
    funny: [
      'الفيزياء استسلمت هنا تماماً',
      'الكرة رفضت الخروج بوضوح',
      'الفجوة خدعت الكرة 💀',
      'بقي بكسل واحد فقط على النجاة',
      'نهاية غير متوقعة ومضحكة',
      'الجاذبية عنيدة جداً اليوم',
    ],
    suspense: [
      'قريب جداً لدرجة حبس الأنفاس',
      'كادت تخرج ۷ مرات متتالية',
      'الحلقة الأخيرة تهتز بشدة',
      'هل ستتحطم الحلقة الأخيرة؟',
      'دقات القلب تتسارع في النهاية',
      'فارق ميكروميتر واحد فقط',
    ],
  },
  es: {
    curiosity: [
      '¿podrá escapar la bola??',
      'espera al último anillo',
      'el final te va a sorprender',
      '¿cómo encontró la salida??',
      'mira los últimos 5 segundos',
      'nadie esperaba ese rebote',
    ],
    challenge: [
      'apuesto a que no puedes parpadear',
      'adivina el color ganador',
      'solo el 1% lo adivina',
      'intenta no sentir satisfacción',
      'adivina antes de que llegue a cero',
      'lo verás dos veces seguro',
    ],
    prediction: [
      'elige tu color antes de empezar',
      '¿cian o rosa: quién gana??',
      'comenta tu favorito aquí 👇',
      '¿quién se lleva el trofeo 🏆??',
      'apoya a tu color en comentarios',
      '¿cuál se llena primero??',
    ],
    countdown: [
      'escapa exactamente en 0.0s',
      '60 segundos en el reloj',
      'salvada épica en el último segundo',
      'el temporizador llega a cero y cae',
      'últimos 3 segundos de infarto',
      'cero segundos restantes 🔥',
    ],
    asmr: [
      'usa auriculares para el asmr',
      'sonidos relajantes y satisfactorios',
      'armónicos de cristal cristalino',
      'corte suave y crujiente de jabón',
      'diseño sonoro ultra relajante',
      'satisfacción auditiva pura',
    ],
    funny: [
      'la física se rindió aquí',
      'la bola dijo que no salía 💀',
      'el hueco la rechazó por completo',
      'a un solo píxel de la libertad',
      'el final fue una falta de respeto',
      'la gravedad tenía problemas personales',
    ],
    suspense: [
      'tan cerca que duele',
      'casi escapa 7 veces seguidas',
      'el último anillo está temblando',
      '¿se romperá el último aro??',
      'el corazón a mil por hora',
      'a un milímetro de lograrlo',
    ],
  },
  pt: {
    curiosity: [
      'a bola vai conseguir escapar??',
      'espere pelo último anel',
      'o final vai te surpreender',
      'como ela achou a saída??',
      'assista aos últimos 5 segundos',
      'ninguém esperava esse rebote',
    ],
    challenge: [
      'duvido você não piscar',
      'adivinhe o vencedor antes do fim',
      'só 1% acerta o palpite',
      'tente não relaxar com o som',
      'adivinhe antes do cronômetro zerar',
      'você vai rever duas vezes',
    ],
    prediction: [
      'escolha sua cor antes de começar',
      'qual cor leva a melhor?? 👇',
      'deixe seu palpite nos comentários',
      'quem leva o troféu 🏆??',
      'azul ou rosa: quem ganha??',
      'qual enche primeiro??',
    ],
    countdown: [
      'escapa exatamente em 0.0s',
      '60 segundos no relógio',
      'clutch épico no último segundo',
      'o tempo zera e a bola cai',
      'últimos 3 segundos de pura tensão',
      'zero segundos restantes 🔥',
    ],
    asmr: [
      'coloque fones para sentir o asmr',
      'sons relaxantes e satisfatórios',
      'harmônicos de cristal puro',
      'corte suave de sabão com fio',
      'áudio binaural relaxante',
      'chuva de xilofone de vidro',
    ],
    funny: [
      'a física desistiu totalmente aqui',
      'a bola se recusou a sair 💀',
      'a saída rejeitou a coitada',
      'faltou um milímetro para a glória',
      'o final foi pura zoeira',
      'a gravidade levou pro pessoal',
    ],
    suspense: [
      'tão perto que dá aflição',
      'quase escapou 7 vezes seguidas',
      'o último anel está tremendo',
      'será que o anel vai quebrar??',
      'coração acelerando a cada segundo',
      'por um triz ela não escapa',
    ],
  },
  id: {
    curiosity: [
      'apakah bolanya bisa lolos??',
      'tunggu lingkaran terakhir',
      'endingnya bakal bikin kaget',
      'bagaimana dia bisa nemu celah??',
      'tonton 5 detik terakhir',
      'pantulan terakhirnya di luar dugaan',
    ],
    challenge: [
      'coba jangan berkedip',
      'tebak warna yang bakal menang',
      'hanya 1% yang tebakannya tepat',
      'tebak sebelum waktu habis',
      'pasti kamu putar ulang dua kali',
      'fokus ke bola emas pertama',
    ],
    prediction: [
      'pilih warnamu sebelum mulai',
      'siapa yang bakal juara?? 👇',
      'tulis jagoanmu di komentar',
      'siapa yang bawa pulang piala 🏆??',
      'merah vs biru: dukung mana??',
      'prediksi sekarang juga',
    ],
    countdown: [
      'lolos tepat di detik 0.0',
      '60 detik di jam perhitungan',
      'detik terakhir yang menegangkan',
      'waktu habis dan bola meluncur',
      '3 detik terakhir penyelamatan epik',
      'nol detik tersisa 🔥',
    ],
    asmr: [
      'pakai headphone untuk asmr terbaik',
      'suara satisfying yang menenangkan',
      'dentingan kristal kaca yang jernih',
      'irisan sabun yang renyah dan lembut',
      'desain audio relaksasi pikiran',
      'ketukan bola marmer yang merdu',
    ],
    funny: [
      'hukum fisika menyerah di sini',
      'bolanya malah ogah keluar 💀',
      'ditolak mentah-mentah sama celah',
      'kurang satu piksel doang padahal',
      'endingnya malah bikin senyum',
      'gravitasinya punya masalah pribadi',
    ],
    suspense: [
      'sedikit lagi sampai bikin deg-degan',
      'hampir lolos 7 kali berturut-turut',
      'lingkaran terakhir mulai goyah',
      'apakah lingkaran terakhir bakal pecah??',
      'jantung berdegup kencang',
      'hanya selisih satu rambut',
    ],
  },
  tr: {
    curiosity: [
      'top kaçabilecek mi??',
      'son halkayı mutlaka bekle',
      'sonu seni gerçekten şaşırtacak',
      'çıkış yolunu nasıl buldu??',
      'son 5 saniyeye dikkat et',
      'kimse bu son sekmeyi beklemiyordu',
    ],
    challenge: [
      'gözünü kırpmadan izleyebilir misin',
      'kazanan rengi tahmin et',
      'sadece %1 doğru tahmin ediyor',
      'süre bitmeden önce tahminini yap',
      'kesinlikle iki kez izleyeceksin',
      'altın küreyi ilk kim bulacak',
    ],
    prediction: [
      'başlamadan önce rengini seç',
      'hangi renk kazanır?? 👇',
      'favorini yoruma yaz',
      'kupayı kim alacak 🏆??',
      'kırmızı mı mavi mi: tarafını seç',
      'hangi taraf önce dolacak??',
    ],
    countdown: [
      'tam olarak 0.0 saniyede kaçıyor',
      '60 saniyelik geri sayım başladı',
      'son saniyede efsanevi kurtarış',
      'sayaç sıfırlandı ve top düştü',
      'son 3 saniyelik büyük heyecan',
      'sıfır saniye kaldı 🔥',
    ],
    asmr: [
      'maksimum asmr için kulaklık tak',
      'rahatlatıcı ve tatmin edici sesler',
      'kristal cam tınıları',
      'yumuşak sabun dilimleme çıtırtısı',
      'huzur veren fizik ses tasarımı',
      'mermer ksilofon melodisi',
    ],
    funny: [
      'fizik kuralları burada pes etti',
      'top resmen çıkmayı reddetti 💀',
      'boşluk topu geri püskürttü',
      'özgürlüğe bir piksel kala',
      'sonu tam bir komedi oldu',
      'yerçekiminin özel bir garezi vardı',
    ],
    suspense: [
      'o kadar yakındı ki nefes kesti',
      'neredeyse 7 kez art arda kaçıyordu',
      'son halka sallanıyor',
      'son halka kırılacak mı??',
      'kalp atışları her saniye hızlanıyor',
      'kıl payı mesafeyle kurtuldu',
    ],
  },
};

/**
 * Generate 6 varied offline hooks tailored to the simulation
 */
export function generateOfflineHooks(options: HookGenerationOptions): string[] {
  const lang = options.language || 'en';
  const langTemplates = OFFLINE_HOOK_TEMPLATES[lang] || OFFLINE_HOOK_TEMPLATES.en;
  const styles = options.styles && options.styles.length > 0 ? options.styles : (['curiosity', 'challenge', 'suspense', 'asmr'] as HookStyle[]);

  const pool: string[] = [];
  for (const style of styles) {
    const list = langTemplates[style] || OFFLINE_HOOK_TEMPLATES.en[style] || [];
    pool.push(...list);
  }

  // Shuffle and select 6
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected: string[] = [];
  const used = new Set<string>();

  for (const item of shuffled) {
    let text = sanitizeText(item);

    // Apply Casing
    if (options.casing === 'lowercase') {
      text = text.toLowerCase();
    } else if (options.casing === 'uppercase') {
      text = text.toUpperCase();
    }

    // Apply Emoji
    if (options.emoji !== false) {
      const emojiList = STYLE_EMOJIS[styles[selected.length % styles.length]] || ['⚡'];
      const chosenEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
      if (!text.includes(chosenEmoji)) {
        text = `${text} ${chosenEmoji}`;
      }
    }

    if (fitsSafeLineLimit(text) && !used.has(text.toLowerCase())) {
      selected.push(text);
      used.add(text.toLowerCase());
      if (selected.length === 6) break;
    }
  }

  // Fallback safety
  while (selected.length < 6) {
    selected.push(`can the ball escape?? 🔥`);
  }

  return selected;
}

/**
 * Generates offline labels for counters, end card CTAs, and contestant names
 */
export function generateOfflineLabels(type: 'counter' | 'end_card_cta' | 'contestant_names', modeName: string): string[] {
  if (type === 'counter') {
    return [
      'rings left to clear',
      'balls trapped inside',
      'near-misses recorded',
      'bounces before escape',
      'survival percentage %',
      'attempts on this seed',
    ];
  } else if (type === 'end_card_cta') {
    return [
      'follow for part 2 • comment ur color',
      'did you predict correctly?? drop a ❤️',
      'tag someone who needs to see this',
      'comment what mode we should do next 👇',
      'part 2 dropping tomorrow • follow',
      'which contestant clutched in your view??',
    ];
  } else {
    // contestant_names
    return [
      'NEO, CYBER, NOVA, VIPER',
      'ALEX, SAM, JORDAN, CHRIS',
      'BLAZE, FROST, SHADOW, TITAN',
      'RUBY, SAPPHIRE, EMERALD, GOLD',
      'PIXEL, VECTOR, ATOM, QUANTUM',
      'STORM, FLASH, ECHO, PULSE',
    ];
  }
}
