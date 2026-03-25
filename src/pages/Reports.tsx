import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Users, Briefcase, CalendarClock } from 'lucide-react';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalFiles: 0,
    totalProjects: 0,
    expiringFiles: 0,
  });
  const [filesByMonth, setFilesByMonth] = useState<any[]>([]);
  const [projectsByStatus, setProjectsByStatus] = useState<any[]>([]);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const [clientsSnap, filesSnap, projectsSnap] = await Promise.all([
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'files')),
          getDocs(collection(db, 'projects'))
        ]);

        const files = filesSnap.docs.map(d => d.data());
        const projects = projectsSnap.docs.map(d => d.data());

        // Basic Stats
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const expiring = files.filter(f => {
          if (!f.expiryDate) return false;
          const expiry = new Date(f.expiryDate);
          return expiry <= thirtyDaysFromNow;
        }).length;

        setStats({
          totalClients: clientsSnap.size,
          totalFiles: filesSnap.size,
          totalProjects: projectsSnap.size,
          expiringFiles: expiring
        });

        // Files by Month (Expiry)
        const monthCounts: Record<string, number> = {};
        files.forEach(f => {
          if (f.expiryDate) {
            const date = new Date(f.expiryDate);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
          }
        });

        const chartData = Object.entries(monthCounts)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(0, 6); // Show next 6 months

        setFilesByMonth(chartData);

        // Projects by Status
        const statusCounts: Record<string, number> = {
          'active': 0,
          'completed': 0,
          'on-hold': 0
        };
        projects.forEach(p => {
          if (p.status && statusCounts[p.status] !== undefined) {
            statusCounts[p.status]++;
          }
        });

        setProjectsByStatus([
          { name: 'نشط', value: statusCounts['active'], color: '#3b82f6' },
          { name: 'مكتمل', value: statusCounts['completed'], color: '#10b981' },
          { name: 'معلق', value: statusCounts['on-hold'], color: '#f59e0b' }
        ]);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">جاري تحميل التقارير...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">التقارير والإحصائيات</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalClients}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">إجمالي الملفات</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalFiles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">المشاريع</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">تجديدات قريبة</p>
              <p className="text-2xl font-bold text-slate-800">{stats.expiringFiles}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">انتهاء صلاحية الملفات (الأشهر القادمة)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filesByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="عدد الملفات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">حالة المشاريع</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {projectsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {projectsByStatus.map((status, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-sm text-slate-600">{status.name} ({status.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
