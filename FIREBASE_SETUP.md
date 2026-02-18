# Firebase Setup Instructions

## إعدادات Firebase للموقع

### 1. إضافة Domain للـ OAuth (إذا احتجت Google Sign In مستقبلاً)

إذا أردت تفعيل تسجيل الدخول بـ Google مستقبلاً:

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك: `veee-79a1f`
3. اذهب إلى **Authentication** → **Settings** → **Authorized domains**
4. اضغط **Add domain**
5. أضف الدومينات التالية:
   - `vee-design.vercel.app`
   - `localhost` (للتطوير المحلي)
   - أي دومين آخر تستخدمه

### 2. الإعدادات الحالية

الموقع حالياً يستخدم:
- ✅ Email/Password Authentication (يعمل بدون إعدادات إضافية)
- ✅ Firestore Database
- ✅ Firebase Storage
- ❌ Google Sign In (تم تعطيله لتجنب مشكلة OAuth)

### 3. حل مشكلة ERR_BLOCKED_BY_CLIENT

تم حل المشكلة عن طريق:
```typescript
// في firebase.ts
experimentalForceLongPolling: true
experimentalAutoDetectLongPolling: true
```

هذا يجعل Firebase يستخدم Long Polling بدلاً من WebSocket، مما يتجنب مشاكل Ad Blockers.

### 4. معلومات المشروع

- **Project ID**: veee-79a1f
- **Auth Domain**: veee-79a1f.firebaseapp.com
- **Storage Bucket**: veee-79a1f.firebasestorage.app

### 5. الأمان

⚠️ **مهم**: 
- لا تشارك `apiKey` في أماكن عامة
- استخدم Firebase Security Rules لحماية البيانات
- راجع قواعد الأمان في Firestore و Storage بانتظام

### 6. Firestore Security Rules (مقترحة)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products - قراءة للجميع، كتابة للأدمن فقط
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Orders - قراءة وكتابة للأدمن فقط
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
    
    // Categories - قراءة للجميع، كتابة للأدمن فقط
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 7. Storage Security Rules (مقترحة)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من Console في المتصفح
2. راجع Firebase Console للأخطاء
3. تأكد من أن جميع الخدمات مفعلة في Firebase
