/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import EmployeeForm from './components/EmployeeForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';

export default function App() {
  const [view, setView] = useState<'employee' | 'admin' | 'admin-login'>('employee');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAdminLoggedIn(true);
    }
  }, []);

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    setView('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAdminLoggedIn(false);
    setView('employee');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-teal-600">Al-Qur'an Pagi</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setView('employee')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'employee' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                Isi Kehadiran
              </button>
              <button
                onClick={() => {
                  if (isAdminLoggedIn) {
                    setView('admin');
                  } else {
                    setView('admin-login');
                  }
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'admin' || view === 'admin-login' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                Dashboard HRD
              </button>
              {isAdminLoggedIn && (
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'employee' && <EmployeeForm />}
        {view === 'admin-login' && <AdminLogin onLogin={handleAdminLogin} />}
        {view === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
}
