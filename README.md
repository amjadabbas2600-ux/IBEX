# IBEX Software — متجر التطبيقات

موقع ثنائي اللغة (عربي / إنجليزي) لعرض وتحميل تطبيقات أندرويد APK مع تقييم وإحصائيات، مربوط بمشروع Firebase: `ibex-aa90e`.

## الصفحات
- الرئيسية
- تسجيل الدخول / إنشاء حساب (إجباري قبل التحميل والتقييم)
- متجر التطبيقات + صفحة تفاصيل + تقييم بالنجوم
- لوحة إدارة: رفع أيقونة + APK، إحصائيات التحميل والتقييم، حذف تطبيق

## تفعيل Firebase (مهم جداً)

1. Authentication → Sign-in method → فعّل **Email/Password**.
2. Firestore Database → أنشئ قاعدة البيانات.
3. Storage → ابدأ التخزين في نفس المشروع.
4. الصق القواعد التالية.

### قواعد Firestore
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin() {
      return signedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{uid} {
      allow read: if signedIn();
      allow create: if signedIn() && request.auth.uid == uid;
      allow update: if request.auth.uid == uid || isAdmin();
    }

    match /apps/{appId} {
      allow read: if signedIn();
      allow write: if isAdmin();
      match /ratings/{uid} {
        allow read: if signedIn();
        allow create, update: if signedIn() && request.auth.uid == uid;
      }
    }

    match /downloads/{id} {
      allow create: if signedIn();
      allow read: if isAdmin();
    }
  }
}
```

### قواعد Storage
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /apps/{appId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## جعل أول حساب مدير
بعد إنشاء حسابك من الموقع، افتح Firestore → مجموعة `users` → مستند الـ UID الخاص بك → غيّر الحقل:

```
role: admin
```

بعد تحديث الصفحة سيظهر زر **لوحة الإدارة**.

## الرفع على Firebase Hosting
من مجلد `ibex-store`:

```
npm i -g firebase-tools
firebase login
firebase init hosting
# public directory: .
firebase deploy
```

الملف `firebase.json` جاهز إذا اخترت هذا المجلد كـ public.
