import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Search, Edit2, Trash2, FileText, Send } from 'lucide-react';

export default function Files() {
  const [files, setFiles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<any>(null);
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    clientId: '',
    name: '',
    type: 'سجل تجاري',
    expiryDate: '',
    responsible: '',
    renewalCost: 0,
    status: 'active'
  });

  const fetchData = async () => {
    try {
      // Fetch clients for the dropdown
      const clientsSnap = await getDocs(query(collection(db, 'clients'), orderBy('name')));
      const clientsData = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsData);

      // Fetch files
      const filesSnap = await getDocs(query(collection(db, 'files'), orderBy('createdAt', 'desc')));
      const filesData = filesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFiles(filesData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      if (!selectedClient) return;

      const fileData = {
        ...formData,
        clientName: selectedClient.name,
        clientType: selectedClient.type || 'غير محدد',
        renewalCost: Number(formData.renewalCost)
      };

      if (editingFile) {
        await updateDoc(doc(db, 'files', editingFile.id), fileData);
      } else {
        await addDoc(collection(db, 'files'), {
          ...fileData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingFile(null);
      setFormData({
        clientId: '', name: '', type: 'سجل تجاري', expiryDate: '', responsible: '', renewalCost: 0, status: 'active'
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, editingFile ? OperationType.UPDATE : OperationType.CREATE, 'files');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الملف؟')) {
      try {
        await deleteDoc(doc(db, 'files', id));
        fetchData();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `files/${id}`);
      }
    }
  };

  const handleSendAlert = async (file: any) => {
    const client = clients.find(c => c.id === file.clientId);
    if (!client?.email) {
      alert('لا يوجد بريد إلكتروني مسجل لهذا العميل.');
      return;
    }

    setSendingAlert(file.id);
    try {
      const response = await fetch('/api/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          clientId: file.clientId,
          clientEmail: client.email,
          clientName: file.clientName,
          fileName: file.name,
          expiryDate: file.expiryDate
        })
      });

      if (response.ok) {
        alert('تم إرسال التنبيه بنجاح!');
      } else {
        const error = await response.json();
        alert(`فشل إرسال التنبيه: ${error.error || 'خطأ غير معروف'}`);
      }
    } catch (error) {
      console.error('Error sending alert:', error);
      alert('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setSendingAlert(null);
    }
  };

  const filteredFiles = files.filter(file => 
    file.name.includes(searchTerm) || 
    file.clientName.includes(searchTerm) ||
    file.type.includes(searchTerm) ||
    (file.responsible && file.responsible.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">إدارة الملفات</h1>
        <button
          onClick={() => {
            setEditingFile(null);
            setFormData({
              clientId: '', name: '', type: 'سجل تجاري', expiryDate: '', responsible: '', renewalCost: 0, status: 'active'
            });
            setIsModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة ملف</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم الملف، العميل، أو المسؤول..."
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
                <th className="p-4 font-medium">العميل</th>
                <th className="p-4 font-medium">تاريخ الانتهاء</th>
                <th className="p-4 font-medium">المسؤول</th>
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
                  <td colSpan={5} className="p-8 text-center text-slate-500">لا توجد ملفات</td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const isExpiring = file.expiryDate && new Date(file.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 30));
                  
                  return (
                    <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{file.name}</p>
                            <p className="text-xs text-slate-500">{file.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{file.clientName}</p>
                        <p className="text-xs text-slate-500">{file.clientType}</p>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          isExpiring ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {file.expiryDate ? new Date(file.expiryDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{file.responsible || '-'}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSendAlert(file)}
                            disabled={sendingAlert === file.id}
                            title="إرسال تنبيه للعميل"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Send className={`w-4 h-4 ${sendingAlert === file.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingFile(file);
                              setFormData({
                                clientId: file.clientId,
                                name: file.name,
                                type: file.type,
                                expiryDate: file.expiryDate || '',
                                responsible: file.responsible || '',
                                renewalCost: file.renewalCost || 0,
                                status: file.status || 'active'
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                {editingFile ? 'تعديل الملف' : 'إضافة ملف جديد'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="fileForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">العميل *</label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">اختر العميل...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.type || 'غير محدد'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم الملف *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">نوع الملف</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="سجل تجاري">سجل تجاري</option>
                      <option value="بطاقة ضريبية">بطاقة ضريبية</option>
                      <option value="شهادة زكاة">شهادة زكاة</option>
                      <option value="رخصة بلدية">رخصة بلدية</option>
                      <option value="تأمينات اجتماعية">تأمينات اجتماعية</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الانتهاء *</label>
                    <input
                      type="date"
                      required
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">المسؤول</label>
                    <input
                      type="text"
                      value={formData.responsible}
                      onChange={(e) => setFormData({...formData, responsible: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">تكلفة التجديد</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.renewalCost}
                      onChange={(e) => setFormData({...formData, renewalCost: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="submit"
                form="fileForm"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-2 rounded-lg transition-colors"
              >
                {editingFile ? 'حفظ التعديلات' : 'إضافة الملف'}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
