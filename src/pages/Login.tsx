import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Building2, Lock, ShieldCheck, ExternalLink, UserCircle2 } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    // Force prompt to select account to avoid auto-login loops in some browsers
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('هذا النطاق غير مصرح به. يرجى إضافته في إعدادات Firebase.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية. الرجاء المحاولة مرة أخرى وعدم إغلاق النافذة.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة بواسطة المتصفح. يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع.');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء الدخول كزائر. يرجى التأكد من تفعيل الدخول المجهول (Anonymous) في إعدادات Firebase.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center bg-slate-900 text-white">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
            <Building2 className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold mb-2">نظام المحاسب القانوني</h1>
          <p className="text-slate-400 text-sm">إدارة متكاملة للملفات والعملاء والتجديدات</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول باستخدام Google'}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">أو</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-slate-900 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <UserCircle2 className="w-5 h-5" />
              {loading ? 'جاري الدخول...' : 'الدخول كزائر (للتجربة)'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-sm text-amber-800 text-center mb-3">
              إذا كنت تواجه مشكلة في تسجيل الدخول، تأكد من السماح بالنوافذ المنبثقة (Popups) أو جرب فتح التطبيق في نافذة جديدة.
            </p>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>فتح التطبيق في نافذة جديدة</span>
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>نظام آمن</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>بيانات مشفرة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
