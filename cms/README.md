# מערכת הניהול של האתר

## איך זה בנוי
- `content/content.json`: כל התוכן של האתר (טקסטים, תמונות, סרטונים, רשימות).
- `cms/template.html`: העיצוב והקוד של הדף, עם מקומות לתוכן (`{{...}}`).
- `cms/render.js`: מחבר בין התבנית לתוכן ומייצר את `index.html`.
- `admin/`: ממשק הניהול, בכתובת `/admin`.
- `functions/api/`: השרת של Cloudflare. הוא מטפל בכניסה, בקריאת התוכן ובשמירה.

### מה קורה כשלוחצים "שמירה ופרסום"
1. נוצר commit אחד ל-GitHub. הוא כולל את `content.json` המעודכן, את `index.html` שנבנה מחדש ואת הקבצים שהועלו (`assets/uploads/`).
2. Cloudflare מזהה את ה-commit ומעלה גרסה חדשה של האתר תוך כדקה.

## עבודה על העיצוב (למפתחת)
**לא עורכים את `index.html` ישירות**, כי השמירה הבאה מהמערכת תדרוס אותו.

סדר העבודה:
1. עורכים את `cms/template.html`.
2. מריצים:

```bash
node cms/build.mjs
```

3. עושים commit ל-template ול-index ביחד.

לפני שעורכים, צריך למשוך את השינויים שנשמרו מהמערכת:

```bash
git pull
```

### בדיקה מקומית של המערכת
מריצים:

```bash
node cms/dev-server.mjs
```

ונכנסים ל-http://localhost:5179/admin/ עם כל סיסמה.

**שימו לב:** בבדיקה מקומית השמירה כותבת לקבצים המקומיים.

## הגדרה ב-Cloudflare Pages (פעם אחת)
**חיבור הפרויקט:**
- Framework preset: None
- Build command: ריק
- Build output directory: `/`

**משתני סביבה:** Settings → Variables and Secrets, להגדיר כ-Secret.

| משתנה | ערך |
|---|---|
| `GITHUB_TOKEN` | Fine-grained token: רק הריפו `nerya-lahav`, עם הרשאת Contents: Read and write |
| `GITHUB_REPO` | `TamiWien/nerya-lahav` |
| `GITHUB_BRANCH` | `main` |
| `SESSION_SECRET` | מחרוזת אקראית ארוכה, למשל הפלט של `openssl rand -hex 32` |
| `PASSWORD_NERIYA` | הסיסמה של נריה |
| `PASSWORD_TAMAR` | הסיסמה של תמר |

אחרי שמגדירים או משנים משתנים צריך לעשות Redeploy.

**החלפת סיסמה:** משנים את המשתנה ב-Cloudflare ועושים Redeploy.

**תוקף הטוקן של GitHub:** כשהוא פג, השמירה מחזירה הודעה על בעיית הרשאה. במקרה כזה יוצרים טוקן חדש ומחליפים את `GITHUB_TOKEN`.
