/* What the admin shows for each part of the site.
   Field types: text, textarea, rich (bold + line breaks), image, video, select, number, toggle, strings, list, note.
   k = path inside content.json (relative to the list item inside a list). */

const ICON_OPTIONS = [
  { v: 'assets/img/ic-phone.png', t: 'טלפון' },
  { v: 'assets/img/ic-home.png', t: 'בית' },
  { v: 'assets/img/ic-pillow.png?v=3', t: 'כרית' },
  { v: 'assets/img/ic-guide.png', t: 'חוברת' },
  { v: 'assets/img/ic-pin.png', t: 'מיקום' }
];
const FOOT_ICONS = [{ v: 'home', t: 'בית' }, { v: 'route', t: 'מסלול' }, { v: 'clock', t: 'שעון' }, { v: 'pin', t: 'מיקום' }, { v: 'phone', t: 'טלפון' }];
const ANCHORS = [
  { v: '#about', t: 'היכרות' }, { v: '#process', t: 'צעד אחר צעד' }, { v: '#included', t: 'לצדכם מהרגע הראשון' },
  { v: '#voices', t: 'המלצות' }, { v: '#moments', t: 'רגעים מבריתות' }, { v: '#faq', t: 'שאלות נפוצות' }, { v: '#contact', t: 'צור קשר' }
];

export const SECTIONS = [
  {
    id: 'settings', title: 'פרטים כלליים', anchor: 'top',
    intro: 'מספר הטלפון והגדרות שמשפיעות על כל האתר.',
    fields: [
      { k: 'settings.phone', label: 'מספר טלפון', type: 'text', dir: 'ltr', required: true, pattern: '^0[0-9]{1,2}-?[0-9]{7}$', help: 'מופיע בכל כפתורי ההתקשרות באתר. כפתורי הוואטסאפ משתמשים באותו מספר.', placeholder: '054-2233665' },
      { k: 'settings.whatsapp_msg', label: 'הודעה פותחת בוואטסאפ', type: 'text', help: 'הטקסט שנכתב מראש כשלוחצים על הכפתור הראשי בראש האתר.' },
      { type: 'note', label: 'גוגל ושיתוף ברשתות', help: 'כך האתר מופיע בתוצאות החיפוש וכשמשתפים קישור בוואטסאפ.' },
      { k: 'settings.title', label: 'כותרת הדף', type: 'text', required: true, max: 60, help: 'השורה הכחולה בתוצאות של גוגל.' },
      { k: 'settings.description', label: 'תיאור לגוגל', type: 'textarea', max: 160, help: 'עד כ-160 תווים, בגוגל רואים רק את ההתחלה.' },
      { k: 'settings.og_title', label: 'כותרת בשיתוף', type: 'text', max: 70 },
      { k: 'settings.og_description', label: 'תיאור בשיתוף', type: 'textarea', max: 200 },
      { k: 'settings.og_image', label: 'תמונה בשיתוף', type: 'image', help: 'התמונה שמופיעה כששולחים את הקישור. מומלץ תמונה לרוחב.' }
    ]
  },
  {
    id: 'nav', title: 'תפריט', anchor: 'top',
    intro: 'הקישורים בראש האתר ובתחתית שלו.',
    fields: [
      { k: 'nav', label: 'קישורים בתפריט', type: 'list', item: 'קישור', title: 'label', min: 1, max: 7, fields: [
        { k: 'label', label: 'שם בתפריט', type: 'text', required: true, max: 22 },
        { k: 'href', label: 'מוביל אל', type: 'select', options: ANCHORS }
      ], blank: { label: '', href: '#about' } }
    ]
  },
  {
    id: 'hero', title: 'פתיחה', anchor: 'top',
    intro: 'המסך הראשון שרואים כשנכנסים לאתר.',
    fields: [
      { k: 'hero.line1', label: 'כותרת: שורה ראשונה', type: 'text', required: true },
      { k: 'hero.gold', label: 'כותרת: שורה מודגשת בזהב', type: 'text', required: true, help: 'אפשר עם ניקוד.' },
      { k: 'hero.lede', label: 'טקסט פתיחה', type: 'rich', required: true },
      { k: 'hero.cta', label: 'טקסט בכפתור הוואטסאפ', type: 'text', required: true, max: 30 },
      { k: 'hero.video', label: 'סרטון רקע', type: 'video', help: 'סרטון קצר ושקט שרץ ברקע. עדיף עד 10MB.' },
      { k: 'hero.photos', label: 'תמונות הפולארויד', type: 'list', item: 'תמונה', fixed: true, fields: [{ k: 'src', label: 'תמונה', type: 'image' }] },
      { type: 'note', label: 'החותמת המסתובבת' },
      { k: 'hero.ring_outer', label: 'טבעת חיצונית (פסוק)', type: 'text', help: 'שומרים על אורך דומה כדי שהטקסט ימלא את העיגול.' },
      { k: 'hero.ring_inner', label: 'טבעת פנימית', type: 'strings', item: 'מילה', fixed: true, max: 14 },
      { type: 'note', label: 'שורת ההסמכות' },
      { k: 'hero.creds_label', label: 'כותרת', type: 'rich' },
      { k: 'hero.creds', label: 'גופים מסמיכים', type: 'list', item: 'גוף', title: 'name', fixed: true, fields: [
        { k: 'name', label: 'שם', type: 'text', required: true },
        { k: 'sub', label: 'שורה קטנה', type: 'text' },
        { k: 'logo', label: 'לוגו (אפור)', type: 'image' },
        { k: 'logo_color', label: 'לוגו (צבעוני, במעבר עכבר)', type: 'image' }
      ] }
    ]
  },
  {
    id: 'ticker', title: 'פס רץ', anchor: 'about',
    intro: 'המילים שרצות בפס הכחול מתחת לפתיחה.',
    fields: [{ k: 'ticker', label: 'מילים בפס', type: 'strings', item: 'מילה', min: 2, max: 8, maxLen: 30 }]
  },
  {
    id: 'about', title: 'היכרות', anchor: 'about',
    fields: [
      { k: 'about.title', label: 'כותרת', type: 'text', required: true },
      { k: 'about.lead', label: 'משפט פתיחה', type: 'rich' },
      { k: 'about.paragraphs', label: 'פסקאות', type: 'list', item: 'פסקה', title: 'text', min: 1, fields: [
        { k: 'text', label: 'טקסט', type: 'rich', required: true },
        { k: 'pull', label: 'להבליט כמשפט גדול', type: 'toggle' }
      ], blank: { text: '', pull: false } },
      { k: 'about.sign', label: 'משפט חתימה', type: 'text' },
      { k: 'about.sign_sub', label: 'שורה מתחת לחתימה', type: 'text' },
      { k: 'about.signature', label: 'חתימה בכתב יד', type: 'text' },
      { k: 'about.image', label: 'תמונת פרופיל', type: 'image', alt: 'about.image_alt' },
      { k: 'about.tags', label: 'תגיות סביב התמונה', type: 'list', item: 'תגית', title: 'big', fixed: true, fields: [
        { k: 'small', label: 'מילה קטנה', type: 'text' },
        { k: 'big', label: 'טקסט ראשי', type: 'text', required: true }
      ] }
    ]
  },
  {
    id: 'process', title: 'צעד אחר צעד', anchor: 'process',
    fields: [
      { k: 'process.title', label: 'כותרת', type: 'text', required: true },
      { k: 'process.sub', label: 'טקסט מתחת לכותרת', type: 'rich' },
      { k: 'process.steps', label: 'שלבים', type: 'list', item: 'שלב', title: 'title', min: 2, max: 6, numbered: true, fields: [
        { k: 'title', label: 'כותרת השלב', type: 'text', required: true },
        { k: 'text', label: 'תיאור', type: 'rich', required: true },
        { k: 'image', label: 'תמונה', type: 'image', alt: 'alt' },
        { k: 'caption', label: 'כיתוב על התמונה', type: 'text', max: 26 }
      ], blank: { title: '', text: '', image: '', alt: '', caption: '' } }
    ]
  },
  {
    id: 'included', title: 'לצדכם מהרגע הראשון', anchor: 'included',
    fields: [
      { k: 'included.title', label: 'כותרת', type: 'text', required: true },
      { k: 'included.sub', label: 'טקסט מתחת לכותרת', type: 'rich' },
      { k: 'included.cards', label: 'כרטיסים', type: 'list', item: 'כרטיס', title: 'title', min: 1, max: 9, numbered: true, fields: [
        { k: 'title', label: 'כותרת', type: 'text', required: true },
        { k: 'text', label: 'טקסט', type: 'rich', required: true },
        { k: 'image', label: 'תמונה', type: 'image', alt: 'alt' },
        { k: 'icon', label: 'אייקון', type: 'select', options: ICON_OPTIONS }
      ], blank: { title: '', text: '', image: '', alt: '', icon: 'assets/img/ic-home.png', icon_width: '' } },
      { k: 'included.bg_image', label: 'תמונת רקע של האזור', type: 'image' }
    ]
  },
  {
    id: 'reels', title: 'סרטוני המלצות', anchor: 'voices',
    fields: [
      { k: 'voices.title', label: 'כותרת', type: 'text', required: true },
      { k: 'voices.sub', label: 'טקסט מתחת לכותרת', type: 'rich' },
      { k: 'voices.reels', label: 'סרטונים', type: 'list', item: 'סרטון', title: 'child', titlePrefix: 'ההורים של ', min: 1, max: 12, fields: [
        { k: 'video', label: 'סרטון', type: 'video', required: true, help: 'קובץ MP4, עדיף עד 40MB. אפשר לאורך או לרוחב.' },
        { k: 'child', label: 'שם התינוק', type: 'text', required: true, help: 'יופיע: ״ההורים של …״' },
        { k: 'parents', label: 'שמות ההורים', type: 'text' },
        { k: 'city', label: 'יישוב', type: 'text' }
      ], blank: { video: '', child: '', parents: '', city: '' } },
      { k: 'voices.invite', label: 'משפט הזמנה מתחת לסרטונים', type: 'text' },
      { k: 'voices.invite_btn', label: 'טקסט בכפתור', type: 'text', max: 24 }
    ]
  },
  {
    id: 'letters', title: 'מכתבים מההורים', anchor: 'mail',
    fields: [
      { k: 'voices.letters.title', label: 'כותרת על המעטפה', type: 'text', required: true },
      { k: 'voices.letters.sub', label: 'טקסט על המעטפה', type: 'rich' },
      { k: 'voices.letters.items', label: 'מכתבים', type: 'list', item: 'מכתב', title: 'child', titlePrefix: 'ההורים של ', min: 1, max: 20, fields: [
        { k: 'text', label: 'תוכן המכתב', type: 'rich', paras: true, required: true, help: 'שורה ריקה מתחילה פסקה חדשה.' },
        { k: 'child', label: 'שם התינוק', type: 'text', required: true, help: 'יופיע: ״ההורים של …״' },
        { k: 'parents', label: 'שמות ההורים', type: 'text' },
        { k: 'city', label: 'יישוב', type: 'text' }
      ], blank: { text: '', child: '', parents: '', city: '' } },
      { k: 'voices.letters.featured', label: 'המכתב בכתב יד שברקע', type: 'number', min: 1, help: 'מספר המכתב ברשימה שמופיע בכתב יד מאחורי המעטפה.' }
    ]
  },
  {
    id: 'moments', title: 'רגעים מבריתות', anchor: 'moments',
    fields: [
      { k: 'moments.title', label: 'כותרת', type: 'text', required: true },
      { k: 'moments.sub', label: 'טקסט מתחת לכותרת', type: 'rich' },
      { k: 'moments.images', label: 'תמונות בגלריה', type: 'list', item: 'תמונה', title: 'alt', min: 3, max: 30, grid: true, fields: [
        { k: 'src', label: 'תמונה', type: 'image', alt: 'alt', required: true }
      ], blank: { src: '', alt: '' } }
    ]
  },
  {
    id: 'faq', title: 'שאלות נפוצות', anchor: 'faq',
    fields: [
      { k: 'faq.title', label: 'כותרת', type: 'text', required: true },
      { k: 'faq.tabs', label: 'לשוניות', type: 'list', item: 'לשונית', title: 'label', fixed: true, fields: [
        { k: 'label', label: 'שם הלשונית', type: 'text', required: true, max: 16 },
        { k: 'items', label: 'שאלות', type: 'list', item: 'שאלה', title: 'q', min: 1, max: 15, fields: [
          { k: 'q', label: 'שאלה', type: 'text', required: true },
          { k: 'a', label: 'תשובה', type: 'rich', required: true }
        ], blank: { q: '', a: '' } }
      ] },
      { k: 'faq.more', label: 'משפט מתחת לשאלות', type: 'text' },
      { k: 'faq.more_btn', label: 'טקסט בכפתור', type: 'text', max: 24 }
    ]
  },
  {
    id: 'final', title: 'צור קשר', anchor: 'contact',
    fields: [
      { k: 'final.title', label: 'כותרת', type: 'text', required: true },
      { k: 'final.title_em', label: 'המשך הכותרת (בזהב)', type: 'text' },
      { k: 'final.sub', label: 'טקסט', type: 'rich' },
      { k: 'final.wa_label', label: 'כפתור וואטסאפ', type: 'text', max: 20 },
      { k: 'final.call_label', label: 'כפתור התקשרות', type: 'text', max: 20 },
      { k: 'final.blessing', label: 'ברכה', type: 'text' },
      { k: 'final.bg_image', label: 'תמונת רקע', type: 'image' }
    ]
  },
  {
    id: 'footer', title: 'תחתית האתר', anchor: 'footer',
    fields: [
      { k: 'footer.tagline', label: 'משפט מתחת ללוגו', type: 'text' },
      { k: 'footer.nav_title', label: 'כותרת עמודת הקישורים', type: 'text' },
      { k: 'footer.services_title', label: 'כותרת עמודת השירות', type: 'text' },
      { k: 'footer.services', label: 'שורות שירות', type: 'list', item: 'שורה', title: 'text', min: 1, max: 6, fields: [
        { k: 'text', label: 'טקסט', type: 'text', required: true },
        { k: 'icon', label: 'אייקון', type: 'select', options: FOOT_ICONS }
      ], blank: { text: '', icon: 'home' } },
      { k: 'footer.wa_btn', label: 'טקסט בכפתור הוואטסאפ', type: 'text', max: 24 },
      { k: 'footer.wordmark', label: 'השם הגדול בתחתית', type: 'text' }
    ]
  }
];
