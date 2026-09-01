import { useState, FormEvent } from 'react';
import { Lock } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });
      
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        onLogin();
      } else {
        setError(data.error || 'PIN Salah');
      }
    } catch (err) {
      setError('Terjadi kesalahan pada server.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
              <Lock className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Akses Dashboard HRD
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Masukkan PIN untuk melanjutkan
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="pin" className="block text-sm font-medium leading-6 text-gray-900">
              PIN
            </label>
            <div className="mt-2">
              <input
                id="pin"
                name="pin"
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
                placeholder="Masukkan PIN"
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-teal-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
