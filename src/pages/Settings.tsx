import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Settings as SettingsIcon, Save, Plus, X } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    cities: ['الرياض', 'جدة', 'الدمام'],
    companyTypes: ['مؤسسة فردية', 'شركة ذات مسؤولية محدودة', 'شركة مساهمة'],
    fileTypes: ['سجل تجاري', 'رخصة بلدية', 'شهادة زكاة', 'تأمينات اجتماعية']
  });

  const [newCity, setNewCity] = useState('');
  const [newCompanyType, setNewCompanyType] = useState('');
  const [newFileType, setNewFileType] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSettings(docSnap.data() as any);
        } else {
          // Initialize if not exists
          await setDoc(docRef, settings);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/general');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/general');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (listName: keyof typeof settings, value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (!value.trim()) return;
    if (settings[listName].includes(value.trim())) return;

    setSettings(prev => ({
      ...prev,
      [listName]: [...prev[listName], value.trim()]
    }));
    setter('');
  };

  const removeItem = (listName: keyof typeof settings, index: number) => {
    setSettings(prev => ({
      ...prev,
      [listName]: prev[listName].filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">الإعدادات العامة</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cities */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">المدن</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('cities', newCity, setNewCity)}
              placeholder="إضافة مدينة جديدة..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={() => addItem('cities', newCity, setNewCity)}
              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.cities.map((city, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                {city}
                <button onClick={() => removeItem('cities', index)} className="text-slate-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Company Types */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">أنواع الشركات</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCompanyType}
              onChange={(e) => setNewCompanyType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('companyTypes', newCompanyType, setNewCompanyType)}
              placeholder="إضافة نوع شركة..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={() => addItem('companyTypes', newCompanyType, setNewCompanyType)}
              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.companyTypes.map((type, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                {type}
                <button onClick={() => removeItem('companyTypes', index)} className="text-slate-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* File Types */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-4">أنواع الملفات</h2>
          <div className="flex gap-2 mb-4 max-w-md">
            <input
              type="text"
              value={newFileType}
              onChange={(e) => setNewFileType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('fileTypes', newFileType, setNewFileType)}
              placeholder="إضافة نوع ملف..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={() => addItem('fileTypes', newFileType, setNewFileType)}
              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.fileTypes.map((type, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                {type}
                <button onClick={() => removeItem('fileTypes', index)} className="text-slate-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
