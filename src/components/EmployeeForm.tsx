import { useState, ChangeEvent, FormEvent } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Upload } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'H', label: 'H (Hadir / Handling)' },
  { value: 'W', label: 'W (Work From Home)' },
  { value: 'I', label: 'I (Izin)' },
  { value: 'S', label: 'S (Sakit)' },
  { value: 'A', label: 'A (Alfa)' },
];

const DEPARTMENTS = [
  'IT & Engineering',
  'HR & Admin',
  'Marketing',
  'Finance',
  'Operations',
  'Sales'
];

export default function EmployeeForm() {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    status: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [file, setFile] = useState<File | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) {
      setError('Silakan ceklis konfirmasi kehadiran sebelum menyimpan.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('department', formData.department);
      submitData.append('status', formData.status);
      submitData.append('date', formData.date);
      if (file) {
        submitData.append('document', file);
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan data');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError('Terjadi kesalahan saat menyimpan data. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-8 bg-white shadow rounded-lg border border-gray-100 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Terima Kasih!</h2>
        <p className="text-gray-600 mb-6">
          Kehadiran Anda untuk membaca Al-Qur'an pagi ini telah berhasil dicatat.
          Semoga harinya berkah!
        </p>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setFormData({
              name: '',
              department: '',
              status: '',
              date: format(new Date(), 'yyyy-MM-dd'),
            });
            setFile(null);
            setIsConfirmed(false);
          }}
          className="text-teal-600 hover:text-teal-700 font-medium"
        >
          Isi Kehadiran Baru
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Daftar Hadir Pagi</h2>
          <p className="text-gray-500 text-sm mt-1">Sesi Membaca Al-Qur'an Karyawan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              disabled={isConfirmed}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm py-2.5 px-3 border ring-1 ring-inset ring-gray-300"
              placeholder="Masukkan nama Anda"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">Divisi / Departemen</label>
            <select
              id="department"
              name="department"
              required
              value={formData.department}
              onChange={handleChange}
              disabled={isConfirmed}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm py-2.5 px-3 border ring-1 ring-inset ring-gray-300"
            >
              <option value="">Pilih Departemen</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tanggal</label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              disabled={isConfirmed}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm py-2.5 px-3 border ring-1 ring-inset ring-gray-300"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status Kehadiran</label>
            <select
              id="status"
              name="status"
              required
              value={formData.status}
              onChange={handleChange}
              disabled={isConfirmed}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm py-2.5 px-3 border ring-1 ring-inset ring-gray-300"
            >
              <option value="">Pilih Status</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Dokumen Pendukung (Opsional)</label>
            <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 py-6 hover:border-teal-400 transition-colors bg-gray-50">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      disabled={isConfirmed}
                      accept="image/*,.pdf,.doc,.docx"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  {file ? file.name : "PNG, JPG, PDF up to 5MB"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input
                id="confirm"
                name="confirm"
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="confirm" className="font-medium text-gray-700">
                Konfirmasi Kehadiran
              </label>
              <p className="text-gray-500">
                Dengan mencentang ini, data yang Anda masukkan sudah benar dan tidak dapat diedit kembali.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isConfirmed || isLoading}
            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
              !isConfirmed || isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500'
            }`}
          >
            {isLoading ? 'Menyimpan...' : 'Kirim Kehadiran'}
          </button>
        </form>
      </div>
    </div>
  );
}
