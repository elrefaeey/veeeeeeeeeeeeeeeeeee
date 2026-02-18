# إعداد رفع الصور - Image Upload Setup

## المشكلة
كانت خدمات رفع الصور تستخدم بيانات تجريبية غير صالحة، مما يسبب فشل رفع الصور.

## الحل
تم تحديث الكود لاستخدام متغيرات البيئة. يجب عليك الآن إعداد حساب مجاني في إحدى الخدمات التالية:

---

## الخيار 1: Cloudinary (موصى به)

### المميزات:
- مجاني حتى 25GB تخزين
- سريع وموثوق
- دعم ممتاز للصور

### خطوات الإعداد:

1. **إنشاء حساب مجاني**
   - اذهب إلى: https://cloudinary.com/users/register_free
   - سجل حساب جديد

2. **الحصول على Cloud Name**
   - بعد تسجيل الدخول، ستجد `Cloud Name` في لوحة التحكم
   - مثال: `dxyz123abc`

3. **إنشاء Upload Preset**
   - اذهب إلى: Settings > Upload
   - اضغط على "Add upload preset"
   - اختر "Unsigned" mode
   - احفظ اسم الـ preset (مثال: `my_preset`)

4. **إضافة المتغيرات**
   - أنشئ ملف `.env` في جذر المشروع
   - أضف:
   ```env
   VITE_CLOUDINARY_CLOUD_NAME=dxyz123abc
   VITE_CLOUDINARY_UPLOAD_PRESET=my_preset
   ```

---

## الخيار 2: ImgBB (بديل)

### المميزات:
- مجاني تماماً
- سهل الإعداد
- لا يحتاج تكوين معقد

### خطوات الإعداد:

1. **إنشاء حساب**
   - اذهب إلى: https://imgbb.com/signup
   - سجل حساب جديد

2. **الحصول على API Key**
   - اذهب إلى: https://api.imgbb.com
   - انسخ الـ API key

3. **إضافة المتغيرات**
   - أنشئ ملف `.env` في جذر المشروع
   - أضف:
   ```env
   VITE_IMGBB_API_KEY=your_api_key_here
   ```

---

## الخيار 3: استخدام كلاهما (الأفضل)

للحصول على أفضل موثوقية، استخدم كلا الخدمتين:

```env
# Cloudinary (الخيار الأول)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset

# ImgBB (خيار احتياطي)
VITE_IMGBB_API_KEY=your_api_key
```

سيحاول النظام Cloudinary أولاً، وإذا فشل سيستخدم ImgBB تلقائياً.

---

## بعد الإعداد

1. **أعد تشغيل خادم التطوير**
   ```bash
   npm run dev
   ```

2. **اختبر رفع الصورة**
   - اذهب إلى لوحة الإدارة
   - حاول إضافة منتج جديد
   - ارفع صورة

---

## ملاحظات مهمة

- ملف `.env` لا يُرفع إلى Git (موجود في `.gitignore`)
- يمكنك نسخ `.env.example` وتعديله
- تأكد من إعادة تشغيل الخادم بعد تعديل `.env`
- جميع الخدمات المذكورة مجانية تماماً

---

## استكشاف الأخطاء

### "Cloudinary not configured"
- تأكد من إضافة `VITE_CLOUDINARY_CLOUD_NAME` و `VITE_CLOUDINARY_UPLOAD_PRESET` في `.env`
- أعد تشغيل خادم التطوير

### "ImgBB not configured"
- تأكد من إضافة `VITE_IMGBB_API_KEY` في `.env`
- أعد تشغيل خادم التطوير

### "Upload preset not found"
- تأكد من أن الـ preset في Cloudinary من نوع "Unsigned"
- تأكد من كتابة اسم الـ preset بشكل صحيح

---

## بدائل أخرى (اختياري)

إذا كنت تفضل خدمات أخرى، يمكنك بسهولة إضافة:
- Firebase Storage
- AWS S3
- Supabase Storage
- أي خدمة أخرى

فقط أضف دالة جديدة في `src/services/localImageService.ts`
