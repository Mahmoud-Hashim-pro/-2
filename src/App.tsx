import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  LayoutDashboard, Users, FileText, FolderKanban, 
  CalendarClock, BarChart3, Settings, Shield, 
  LogOut, Bell, Menu, X 
} from 'lucide-react';
import { cn } from './lib/utils';

// Pages
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Files from './pages/Files';
import Projects from './pages/Projects';
import Renewals from './pages/Renewals';
import Reports from './pages/Reports';
import UsersPage from './pages/Users';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import ClientPortal from './pages/ClientPortal';

function Layout({ userRole, onLogout }: { userRole: string, onLogout: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = userRole === 'client' ? [
    { name: 'بوابة العميل', path: '/', icon: LayoutDashboard },
  ] : userRole === 'guest' ? [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
    { name: 'العملاء', path: '/clients', icon: Users },
    { name: 'الملفات', path: '/files', icon: FileText },
    { name: 'المشاريع', path: '/projects', icon: FolderKanban },
    { name: 'التجديدات', path: '/renewals', icon: CalendarClock },
    { name: 'التقارير', path: '/reports', icon: BarChart3 },
  ] : [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
    { name: 'العملاء', path: '/clients', icon: Users },
    { name: 'الملفات', path: '/files', icon: FileText },
    { name: 'المشاريع', path: '/projects', icon: FolderKanban },
    { name: 'التجديدات', path: '/renewals', icon: CalendarClock },
    { name: 'التقارير', path: '/reports', icon: BarChart3 },
    ...(userRole === 'admin' ? [
      { name: 'المستخدمين', path: '/users', icon: Shield },
      { name: 'الإعدادات', path: '/settings', icon: Settings },
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-slate-900 font-bold">
              م
            </div>
            <span className="text-lg font-bold text-white">المحاسب القانوني</span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive 
                    ? "bg-amber-500/10 text-amber-500 font-medium" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
              {navItems.find(i => i.path === location.pathname)?.name || 'النظام'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-700">{auth.currentUser?.isAnonymous ? 'زائر' : (auth.currentUser?.displayName || 'مستخدم')}</p>
                <p className="text-xs text-slate-500">
                  {userRole === 'admin' ? 'مدير النظام' : userRole === 'client' ? 'عميل' : userRole === 'guest' ? 'زائر (للقراءة فقط)' : 'محاسب'}
                </p>
              </div>
              <img 
                src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.isAnonymous ? 'Guest' : auth.currentUser?.email}&background=f59e0b&color=fff`} 
                alt="Profile" 
                className="w-9 h-9 rounded-full border border-slate-200"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.isAnonymous) {
          setUserRole('guest');
          setIsAuthReady(true);
          return;
        }

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            // Check if it's the default admin
            if (currentUser.email === 'abdallahahmedpilot2426@gmail.com') {
              await setDoc(userDocRef, {
                name: currentUser.displayName || 'Admin',
                email: currentUser.email,
                role: 'admin',
                createdAt: new Date().toISOString()
              });
              setUserRole('admin');
            } else {
              // Check if the email belongs to a client
              const clientsRef = collection(db, 'clients');
              const q = query(clientsRef, where('email', '==', currentUser.email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const clientDoc = querySnapshot.docs[0];
                await setDoc(userDocRef, {
                  name: currentUser.displayName || clientDoc.data().name,
                  email: currentUser.email,
                  role: 'client',
                  clientId: clientDoc.id,
                  createdAt: new Date().toISOString()
                });
                setUserRole('client');
              } else {
                // Not authorized
                await signOut(auth);
                setUser(null);
                setUserRole(null);
                alert('عذراً، هذا الحساب غير مسجل في النظام كعميل أو موظف. يرجى مراجعة مدير النظام.');
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          // Fallback if permission denied but they are the default admin
          if (currentUser.email === 'abdallahahmedpilot2426@gmail.com') {
            setUserRole('admin');
          }
        }
      } else {
        setUserRole(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {user && userRole ? (
          <Route element={<Layout userRole={userRole} onLogout={handleLogout} />}>
            {userRole === 'client' ? (
              <>
                <Route path="/" element={<ClientPortal />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/files" element={<Files />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/renewals" element={<Renewals />} />
                <Route path="/reports" element={<Reports />} />
                {userRole === 'admin' && (
                  <>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </>
                )}
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Route>
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
