import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CalendarClock, AlertTriangle, CheckCircle2, Search } from 'lucide-react';

export default function Renewals() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [renewing, setRenewing] = useState<string | null>(null);

  const fetchRenewals = async () => {
    try {
      const filesSnap = await getDocs(query(collection(db, 'files'), orderBy('expiryDate', 'asc')));
      const filesData = filesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      // Filter files that are expiring within 30 days or already expired
      const expiringFiles = filesData.filter(file => {
        if (!file.expiryDate) return false;
        const expiry = new Date(file.expiryDate);
        return expiry <= thirtyDaysFromNow;
      });

      setFiles(expiringFiles);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewals();
  }, []);

  const handleRenew = async (file: any) => {
    if (window.confirm('هل أنت متأكد من تجديد هذا الملف لمدة سنة إضافية؟')) {
      setRenewing(file.id);
      try {
        const currentExpiry = new Date(file.expiryDate);
        const newExpiry = new Date(currentExpiry.setFullYear(currentExpiry.getFullYear() + 1));
        
        await updateDoc(doc(db, 'files', file.id), {
          expiryDate: newExpiry.toISOString().split('T')[0],
          status: 'renewed'
        });
        
        // Refresh list
        fetchRenewals();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `files/${file.id}`);
      } finally {
        setRenewing(null);
      }
    }
  };

  const filteredFiles = files.filter(file => 
    file.name.includes(searchTerm) || 
    file.clientName.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">التجديدات القادمة</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم الملف أو العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-500 text-sm">
                <th className="p-4 font-medium">الملف</th>
                <th className="p-4 font-medium">تاريخ الانتهاء</th>
                <th className="p-4 font-medium">الأيام المتبقية</th>
                <th className="p-4 font-medium">تكلفة التجديد</th>
                <th className="p-4 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">جاري التحميل...</td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">لا توجد ملفات تحتاج للتجديد قريباً</td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const expiry = new Date(file.expiryDate);
                  const now = new Date();
                  const diffTime = expiry.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isExpired = diffDays < 0;

                  return (
                    <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isExpired ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            <CalendarClock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{file.name}</p>
                            <p className="text-xs text-slate-500">{file.clientName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">
                        {expiry.toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isExpired ? <AlertTriangle className="w-3.5 h-3.5" /> : null}
                          {isExpired ? `منتهي منذ ${Math.abs(diffDays)} يوم` : `متبقي ${diffDays} يوم`}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {file.renewalCost ? `${file.renewalCost} ريال` : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleRenew(file)}
                          disabled={renewing === file.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تجديد الآن</span>
                        </button>
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
