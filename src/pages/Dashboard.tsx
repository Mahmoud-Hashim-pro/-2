import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Users, FileText, AlertTriangle, CheckCircle2, FolderKanban, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalFiles: 0,
    expiringFiles: 0,
    activeProjects: 0
  });
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch total clients
        const clientsSnap = await getDocs(collection(db, 'clients'));
        const totalClients = clientsSnap.size;

        // Fetch total files
        const filesSnap = await getDocs(collection(db, 'files'));
        const totalFiles = filesSnap.size;

        // Fetch expiring files (within 30 days)
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        
        let expiringCount = 0;
        const filesData: any[] = [];
        
        filesSnap.forEach(doc => {
          const data = doc.data();
          filesData.push({ id: doc.id, ...data });
          
          if (data.expiryDate) {
            const expiry = new Date(data.expiryDate);
            if (expiry <= thirtyDaysFromNow && expiry >= now) {
              expiringCount++;
            }
          }
        });

        // Fetch active projects
        const projectsSnap = await getDocs(query(collection(db, 'projects'), where('status', 'in', ['pending', 'in-progress'])));
        const activeProjects = projectsSnap.size;

        setStats({
          totalClients,
          totalFiles,
          expiringFiles: expiringCount,
          activeProjects
        });

        // Sort files by creation date for recent files
        filesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentFiles(filesData.slice(0, 5));

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'dashboard_data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { title: 'إجمالي العملاء', value: stats.totalClients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'إجمالي الملفات', value: stats.totalFiles, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'ملفات تنتهي قريباً', value: stats.expiringFiles, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { title: 'مشاريع نشطة', value: stats.activeProjects, icon: FolderKanban, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">نظرة عامة</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <Icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Files */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">أحدث الملفات المضافة</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-sm">
                  <th className="pb-3 font-medium">اسم الملف</th>
                  <th className="pb-3 font-medium">العميل</th>
                  <th className="pb-3 font-medium">تاريخ الانتهاء</th>
                  <th className="pb-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentFiles.map((file) => {
                  const isExpiring = file.expiryDate && new Date(file.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 30));
                  return (
                    <tr key={file.id} className="text-sm">
                      <td className="py-4 font-medium text-slate-800">{file.name}</td>
                      <td className="py-4 text-slate-600">{file.clientName}</td>
                      <td className="py-4 text-slate-600">
                        {file.expiryDate ? new Date(file.expiryDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          isExpiring ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isExpiring ? 'ينتهي قريباً' : 'ساري'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentFiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">لا توجد ملفات حديثة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions or Info */}
        <div className="bg-slate-900 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
          <h2 className="text-lg font-bold mb-4 relative z-10">تنبيهات النظام</h2>
          <div className="space-y-4 relative z-10">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-400 mb-1">فحص التجديدات</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    النظام يقوم بفحص الملفات يومياً وإرسال تنبيهات بريد إلكتروني للعملاء قبل انتهاء الصلاحية بـ 30 يوماً.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-emerald-400 mb-1">النسخ الاحتياطي</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    يتم حفظ جميع البيانات بشكل آمن ومشفر في قواعد بيانات سحابية.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
