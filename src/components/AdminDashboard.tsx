import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Filter, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download,
  Edit2,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { io } from 'socket.io-client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceRecord {
  id: string;
  name: string;
  department: string;
  status: string;
  date: string;
  time: string;
  documentUrl?: string;
  timestamp: string;
}

const DEPARTMENTS = [
  'Semua Divisi',
  'IT & Engineering',
  'HR & Admin',
  'Marketing',
  'Finance',
  'Operations',
  'Sales'
];

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatYearMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
};

export default function AdminDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('Semua Divisi');
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/attendance');
        const data = await response.json();
        setRecords(data);
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Socket.io for real-time updates
  useEffect(() => {
    // In production, you might want to use the actual URL
    const socket = io(); 

    socket.on('attendance-update', (newRecord: AttendanceRecord) => {
      setRecords((prev) => {
        if (!prev.find(r => r.id === newRecord.id)) {
          return [...prev, newRecord];
        }
        return prev;
      });
    });

    socket.on('attendance-updated', (updatedRecord: AttendanceRecord) => {
      setRecords((prev) => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    });

    socket.on('attendance-deleted', (deletedId: string) => {
      setRecords((prev) => prev.filter(r => r.id !== deletedId));
    });

    socket.on('attendance-month-deleted', (yearMonth: string) => {
      setRecords((prev) => prev.filter(r => !r.date.startsWith(yearMonth)));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchName = record.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = filterDept === 'Semua Divisi' || record.department === filterDept;
      return matchName && matchDept;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records, searchTerm, filterDept]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    const dataByDate: Record<string, { date: string; H: number; W: number; I: number; S: number; A: number }> = {};
    
    records.forEach(r => {
      if (!dataByDate[r.date]) {
        dataByDate[r.date] = { date: r.date, H: 0, W: 0, I: 0, S: 0, A: 0 };
      }
      if (['H', 'W', 'I', 'S', 'A'].includes(r.status)) {
        dataByDate[r.date][r.status as 'H'|'W'|'I'|'S'|'A']++;
      }
    });

    return Object.values(dataByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10); // Last 10 days
  }, [records]);

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = records.filter(r => r.date === today);
    return {
      totalToday: todayRecords.length,
      hadir: todayRecords.filter(r => r.status === 'H' || r.status === 'W').length,
      izin: todayRecords.filter(r => r.status === 'I' || r.status === 'S').length,
      alfa: todayRecords.filter(r => r.status === 'A').length,
    };
  }, [records]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    records.forEach(r => {
      if (r.date) {
        months.add(r.date.substring(0, 7)); // 'YYYY-MM'
      }
    });
    return Array.from(months).sort().reverse();
  }, [records]);

  const handleRekapAndClear = async (yearMonth: string, formatType: 'excel' | 'pdf') => {
    if (!confirm(`Anda akan merekap data bulan ${formatYearMonth(yearMonth)}.\n\nPERINGATAN: Setelah diunduh, seluruh data untuk bulan ini akan DIHAPUS PERMANEN dari sistem.\n\nLanjutkan?`)) return;

    const monthRecords = records.filter(r => r.date.startsWith(yearMonth));

    // Export
    if (formatType === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(
        monthRecords.map(r => ({
          Tanggal: r.date,
          Waktu: r.time,
          Nama: r.name,
          Divisi: r.department,
          Status: r.status,
          Dokumen: r.documentUrl ? 'Ada' : 'Tidak'
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Kehadiran");
      XLSX.writeFile(workbook, `Rekap_Kehadiran_${yearMonth}.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.text(`Laporan Kehadiran Al-Qur'an Pagi - ${formatYearMonth(yearMonth)}`, 14, 15);
      
      const tableColumn = ["Tanggal", "Waktu", "Nama", "Divisi", "Status"];
      const tableRows = monthRecords.map(r => [
        r.date,
        r.time,
        r.name,
        r.department,
        r.status
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });
      
      doc.save(`Rekap_Kehadiran_${yearMonth}.pdf`);
    }

    // Hapus dari Server
    try {
      const response = await fetch(`/api/attendance/month/${yearMonth}`, { method: 'DELETE' });
      if (!response.ok) {
        alert('Gagal menghapus data dari server setelah diunduh.');
      }
    } catch (error) {
      console.error('Failed to delete month:', error);
      alert('Terjadi kesalahan jaringan saat menghapus data dari server.');
    }
  };

  // Automated notification check (simulation based on current time > 09:00)
  const isLate = new Date().getHours() >= 9 && stats.totalToday < 10; // Mock threshold

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data kehadiran ini?')) return;
    try {
      await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Gagal menghapus data.');
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditForm(record);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const response = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        setEditingRecord(null);
        setEditForm({});
      } else {
        alert('Gagal memperbarui data.');
      }
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Gagal memperbarui data.');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Memuat data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard HRD</h2>
          <p className="text-sm text-gray-500">Pemantauan Real-time Kehadiran Al-Qur'an Pagi</p>
        </div>
      </div>

      {isLate && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Peringatan Sistem:</strong> Waktu sudah menunjukkan lewat batas masuk, namun partisipasi kehadiran masih rendah. Harap berikan notifikasi ke karyawan terkait.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rekap Bulanan Section */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-5">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Rekap & Pembersihan Data Bulanan</h3>
        <p className="text-sm text-gray-500 mb-4">
          Unduh laporan absensi per bulan. <strong>Peringatan:</strong> Setelah Anda mengunduh rekap untuk suatu bulan (Excel/PDF), sistem akan <strong>otomatis menghapus</strong> seluruh data pada bulan tersebut secara permanen.
        </p>
        
        {availableMonths.length === 0 ? (
          <p className="text-sm text-gray-400 bg-gray-50 p-4 rounded-md text-center">Belum ada data bulanan.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableMonths.map(ym => (
               <div key={ym} className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-200">
                 <span className="font-medium text-gray-700">{formatYearMonth(ym)}</span>
                 <div className="flex space-x-2">
                   <button 
                     onClick={() => handleRekapAndClear(ym, 'excel')} 
                     className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                     title="Unduh Excel & Hapus"
                   >
                     <FileSpreadsheet className="h-4 w-4 mr-1"/> Excel
                   </button>
                   <button 
                     onClick={() => handleRekapAndClear(ym, 'pdf')} 
                     className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                     title="Unduh PDF & Hapus"
                   >
                     <FileText className="h-4 w-4 mr-1"/> PDF
                   </button>
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="p-5 flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Entry Hari Ini</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.totalToday}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="p-5 flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Hadir & WFH</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.hadir}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="p-5 flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Izin / Sakit</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.izin}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
          <div className="p-5 flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Alfa</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.alfa}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table Section */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg border border-gray-100">
          <div className="p-4 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Riwayat Kehadiran</h3>
            <div className="mt-3 sm:mt-0 flex space-x-2">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border ring-1 ring-inset ring-gray-300"
                  placeholder="Cari nama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 pr-8 sm:text-sm border-gray-300 rounded-md py-2 border ring-1 ring-inset ring-gray-300"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Waktu</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Divisi</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokumen</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Tidak ada data kehadiran</td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.date} <span className="text-gray-500 ml-1">{record.time}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${record.status === 'H' ? 'bg-green-100 text-green-800' : 
                            record.status === 'W' ? 'bg-blue-100 text-blue-800' : 
                            record.status === 'I' || record.status === 'S' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.documentUrl ? (
                          <a href={record.documentUrl} target="_blank" rel="noreferrer" className="text-teal-600 hover:text-teal-900 flex items-center">
                            <Download className="h-4 w-4 mr-1" /> Unduh
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEdit(record)} className="text-blue-600 hover:text-blue-900 mr-3" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(record.id)} className="text-red-600 hover:text-red-900" title="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Grafik Kehadiran (10 Hari Terakhir)</h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Legend wrapperStyle={{fontSize: 12}} />
                  <Bar dataKey="H" name="Hadir" stackId="a" fill="#10b981" />
                  <Bar dataKey="W" name="WFH" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="I" name="Izin" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="S" name="Sakit" stackId="a" fill="#eab308" />
                  <Bar dataKey="A" name="Alfa" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                Belum ada data grafik
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-medium text-gray-900">Edit Data Kehadiran</h3>
              <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm py-2 px-3 border ring-1 ring-inset ring-gray-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Divisi</label>
                <select
                  value={editForm.department || ''}
                  onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm py-2 px-3 border ring-1 ring-inset ring-gray-300"
                >
                  {DEPARTMENTS.filter(d => d !== 'Semua Divisi').map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tanggal</label>
                <input
                  type="date"
                  value={editForm.date || ''}
                  onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm py-2 px-3 border ring-1 ring-inset ring-gray-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editForm.status || ''}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm py-2 px-3 border ring-1 ring-inset ring-gray-300"
                >
                  <option value="H">H (Hadir / Handling)</option>
                  <option value="W">W (Work From Home)</option>
                  <option value="I">I (Izin)</option>
                  <option value="S">S (Sakit)</option>
                  <option value="A">A (Alfa)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
