import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FileText, CalendarClock, Bell, Building2, AlertTriangle } from 'lucide-react';

export default function ClientPortal() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchClientData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists() && userDoc.data().clientId) {
          const clientId = userDoc.data().clientId;
          
          const clientDoc = await getDoc(doc(db, 'clients', clientId));
          if (clientDoc.exists()) {
            setClientData({ id: clientDoc.id, ...clientDoc.data() });
          }

          const q = query(
            collection(db, 'files'),
            where('clientId', '==', clientId)
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const filesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setFiles(filesData);
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'files');
          });

          return () => unsubscribe();
        }
      } catch (error) {
        console.error("Error fetching client data:", error);
        setLoading(false);
      }
    };

    fetchClientData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const expiringFiles = files.filter(file => {
    if (!file.expiryDate) return false;
    const expiry = new Date(file.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry >= now;
  });

  const expiredFiles = files.filter(file => {
    if (!file.expiryDate) return false;
    return new Date(file.expiryDate) < new Date();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مرحباً، {clientData?.name || 'عميلنا العزيز'}</h1>
          <p className="text-slate-500 mt-1">بوابة العميل - متابعة الملفات والتجديدات</p>
        </div>
      </div>

      {/* Alerts Section */}
      {(expiringFiles.length > 0 || expiredFiles.length > 0) && (
        <div className="space-y-4">
          {expiredFiles.map(file => (
            <div key={file.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-red-800">ملف منتهي الصلاحية</h3>
                <p className="text-red-600 mt-1">
                  انتهت صلاحية ملف <strong>{file.name}</strong> ({file.type}) بتاريخ {new Date(file.expiryDate).toLocaleDateString('ar-EG')}. يرجى التواصل معنا لتجديده فوراً.
                </p>
              </div>
            </div>
          ))}

          {expiringFiles.map(file => (
            <div key={file.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800">تنبيه اقتراب انتهاء صلاحية</h3>
                <p className="text-amber-700 mt-1">
                  ملف <strong>{file.name}</strong> ({file.type}) ستنتهي صلاحيته قريباً في {new Date(file.expiryDate).toLocaleDateString('ar-EG')}.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">إجمالي الملفات</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{files.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">تجديدات قريبة</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{expiringFiles.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">نشاط الشركة</p>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{clientData?.type || 'غير محدد'}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">ملفاتي</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-500 text-sm">
                <th className="p-4 font-medium">الملف</th>
                <th className="p-4 font-medium">النوع</th>
                <th className="p-4 font-medium">تاريخ الانتهاء</th>
                <th className="p-4 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">لا توجد ملفات مسجلة</td>
                </tr>
              ) : (
                files.map((file) => {
                  const isExpired = file.expiryDate && new Date(file.expiryDate) < new Date();
                  const isExpiring = file.expiryDate && new Date(file.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 30)) && !isExpired;
                  
                  return (
                    <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-slate-800">{file.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{file.type}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          isExpired ? 'bg-red-100 text-red-700' :
                          isExpiring ? 'bg-amber-100 text-amber-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {file.expiryDate ? new Date(file.expiryDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                        </span>
                      </td>
                      <td className="p-4">
                        {isExpired ? (
                          <span className="text-red-600 text-sm font-medium">منتهي</span>
                        ) : isExpiring ? (
                          <span className="text-amber-600 text-sm font-medium">ينتهي قريباً</span>
                        ) : (
                          <span className="text-emerald-600 text-sm font-medium">ساري</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
