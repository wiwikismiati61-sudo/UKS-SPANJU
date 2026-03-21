
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Pill, 
  Stethoscope, 
  ClipboardCheck, 
  FileText, 
  Settings, 
  LogOut,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  AlertTriangle,
  Menu,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Printer,
  ChevronRight,
  TrendingUp,
  FileBadge,
  Eye,
  LogIn
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  AppDatabase, 
  PageId, 
  Student, 
  Medicine, 
  Transaction, 
  Screening 
} from './types';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  writeBatch,
  getDocs,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';
import { auth, db as firestore } from './src/firebase';

// --- Firebase Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Show user-friendly error
  Swal.fire({
    icon: 'error',
    title: 'Kesalahan Database',
    text: 'Terjadi masalah saat mengakses data. Pastikan Anda memiliki izin yang cukup.',
    footer: `<pre style="font-size: 10px; text-align: left;">${errInfo.error}</pre>`
  });
};

// --- Constants & Defaults ---
const DEFAULT_DB: AppDatabase = {
  user: { username: 'admin', password: '123' },
  siswa: [
    { id: 1, nama: 'Budi Santoso', kelas: '7A' },
    { id: 2, nama: 'Siti Aminah', kelas: '8B' },
    { id: 3, nama: 'Rizky Febian', kelas: '9C' },
    { id: 4, nama: 'Ani Wijaya', kelas: '7B' },
    { id: 5, nama: 'Dedi Kusnandar', kelas: '8A' }
  ],
  obat: [
    { id: 1, nama: 'Paracetamol', stok: 10 },
    { id: 2, nama: 'Betadine', stok: 5 },
    { id: 3, nama: 'Minyak Kayu Putih', stok: 2 },
    { id: 4, nama: 'Antasida Doen', stok: 8 },
    { id: 5, nama: 'Kapas Steril', stok: 15 }
  ],
  transaksi: [],
  screening: []
};

// --- Permit Document Content Component ---
const SuratIzinContent: React.FC<{ data: Transaction }> = ({ data }) => (
  <div className="p-8 sm:p-10 text-black bg-white font-serif border-4 border-double border-slate-300 mx-auto max-w-[210mm]">
    <div className="text-center border-b-2 border-black pb-4 mb-6">
      <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-widest">SURAT IZIN PULANG SISWA</h1>
      <h2 className="text-lg font-bold">SMP NEGERI 7</h2>
      <p className="text-[10px] sm:text-xs">UNIT KESEHATAN SEKOLAH (UKS)</p>
    </div>
    
    <div className="space-y-4 mb-10 text-sm sm:text-base">
      <p>Menerangkan bahwa siswa di bawah ini:</p>
      <table className="w-full">
        <tbody>
          <tr><td className="w-32 sm:w-40 py-1 font-bold">Nama Siswa</td><td className="py-1">: {data.namaSiswa}</td></tr>
          <tr><td className="w-32 sm:w-40 py-1 font-bold">Kelas</td><td className="py-1">: {data.kelas}</td></tr>
          <tr><td className="w-32 sm:w-40 py-1 font-bold">Waktu Periksa</td><td className="py-1">: {data.tanggal.replace('T', ' ')}</td></tr>
          <tr><td className="w-32 sm:w-40 py-1 font-bold">Keluhan</td><td className="py-1">: {data.keluhan}</td></tr>
          <tr><td className="w-32 sm:w-40 py-1 font-bold">Penanganan</td><td className="py-1">: {data.penanganan}</td></tr>
        </tbody>
      </table>
      <p className="italic mt-6 leading-relaxed">
        Diberikan izin untuk pulang lebih awal karena alasan kesehatan dan disarankan untuk beristirahat atau melakukan pemeriksaan lebih lanjut di Puskesmas/Rumah Sakit.
      </p>
    </div>

    <div className="flex justify-between mt-16 px-4">
      <div className="text-center">
        <p className="text-xs sm:text-sm mb-16 italic">Siswa Bersangkutan,</p>
        <p className="text-xs sm:text-sm font-bold underline uppercase">{data.namaSiswa}</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] sm:text-xs mb-1">Dikeluarkan: {new Date().toLocaleDateString('id-ID')}</p>
        <p className="text-xs sm:text-sm mb-16 italic">Penanggung Jawab UKS,</p>
        <p className="text-xs sm:text-sm font-bold underline">(.......................................)</p>
      </div>
    </div>
  </div>
);

// --- Stat Card ---
const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string, trend?: string }> = ({ title, value, icon, color, trend }) => (
  <div className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md group overflow-hidden relative`}>
    <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-xl bg-opacity-10 ${color.replace('border-', 'bg-').replace('-500', '-100')} ${color.replace('border-', 'text-')}`}>
        {icon}
      </div>
      {trend && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><TrendingUp size={10} /> {trend}</span>}
    </div>
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-tight">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
    </div>
  </div>
);

// --- Dashboard Component ---
const Dashboard: React.FC<{ db: AppDatabase, setActivePage: (p: PageId) => void, userRole: string | null }> = ({ db, setActivePage, userRole }) => {
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const uniqueClasses = useMemo(() => [...new Set((db.siswa || []).map(s => s.kelas))].sort(), [db.siswa]);

  const filteredTransactions = useMemo(() => {
    const transaksi = db.transaksi || [];
    return selectedKelas 
      ? transaksi.filter(t => t.kelas === selectedKelas)
      : transaksi;
  }, [db.transaksi, selectedKelas]);

  const filteredScreening = useMemo(() => {
    const screening = db.screening || [];
    return selectedKelas 
      ? screening.filter(s => s.kelas === selectedKelas)
      : screening;
  }, [db.screening, selectedKelas]);

  const lowStock = (db.obat || []).filter(o => o.stok < 3);
  const visitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (db.transaksi || []).forEach(t => {
      counts[t.namaSiswa] = (counts[t.namaSiswa] || 0) + 1;
    });
    return counts;
  }, [db.transaksi]);

  const last10Days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (9 - i));
    return d.toISOString().split('T')[0];
  });
  const chartData = last10Days.map(day => ({
    name: day.split('-').slice(2).join('/'),
    kunjungan: filteredTransactions.filter(t => t.tanggal.startsWith(day)).length,
    screening: filteredScreening.filter(s => s.tanggal === day).length
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {userRole === 'admin' ? 'Halo, Admin UKS 👋' : 'Halo, Pengunjung 👋'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {userRole === 'admin' 
              ? 'Berikut adalah ringkasan kesehatan siswa hari ini.' 
              : `Akses Anda terbatas (Viewer). Email: ${auth.currentUser?.email || 'Tidak diketahui'}`}
          </p>
          {userRole !== 'admin' && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>Hubungi Admin Utama untuk mendapatkan akses penuh.</span>
              </div>
              <button 
                onClick={() => {
                  const email = auth.currentUser?.email || '';
                  navigator.clipboard.writeText(email);
                  Swal.fire({ icon: 'success', title: 'Email Disalin', text: email, timer: 1000, showConfirmButton: false });
                }}
                className="w-fit px-3 py-1 bg-amber-200 hover:bg-amber-300 rounded-lg font-bold transition-colors"
              >
                Salin Email Saya
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'admin' && (
            <button 
              onClick={() => setActivePage('pengaturan')}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
            >
              <Settings size={16} />
              <span>Kelola Pengguna</span>
            </button>
          )}
          <select 
            className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
          >
            <option value="">Semua Kelas</option>
            {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
          </select>
          <button onClick={() => setActivePage('transaksi')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95">
            <Plus size={18}/> Periksa Siswa
          </button>
        </div>
      </header>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Kunjungan" value={filteredTransactions.length} icon={<Users size={20}/>} color="bg-blue-500" trend="+12%" />
        <StatCard title="Siswa Berobat" value={filteredTransactions.filter(t => t.penanganan === 'Minum Obat').length} icon={<Pill size={20}/>} color="bg-emerald-500" />
        <StatCard title="Screening" value={filteredScreening.length} icon={<ClipboardCheck size={20}/>} color="bg-purple-500" />
        <StatCard title="Stok Menipis" value={lowStock.length} icon={<AlertTriangle size={20}/>} color="bg-amber-500" />
        <StatCard title="Rujukan PKM" value={filteredTransactions.filter(t => t.penanganan === 'Rujuk ke Puskesmas').length} icon={<Stethoscope size={20}/>} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-800"><TrendingUp size={18} className="text-blue-600"/> Tren Kunjungan Harian</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="kunjungan" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" name="Kunjungan" />
                <Area type="monotone" dataKey="screening" stroke="#a855f7" strokeWidth={3} fill="transparent" name="Screening" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-slate-800"><AlertTriangle size={18} className="text-amber-500"/> Notifikasi Sistem</h3>
          <div className="space-y-3">
            {lowStock.map((o, i) => (
              <div key={`${o.id}-${i}`} className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                <div className="p-2 bg-amber-200 text-amber-700 rounded-lg h-fit"><Pill size={14}/></div>
                <div><p className="text-[10px] font-black text-amber-800 uppercase">Stok Kritis</p><p className="text-xs text-amber-700 mt-0.5"><strong>{o.nama}</strong> sisa {o.stok} unit.</p></div>
              </div>
            ))}
            {lowStock.length === 0 && <div className="py-10 text-center text-sm text-slate-400 italic">Semua obat dalam kondisi aman.</div>}
          </div>
        </div>
      </div>

      {/* --- Tabel Kunjungan Section --- */}
      <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-[#556B2F] p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-xl sm:text-2xl font-black text-yellow-400 tracking-tight uppercase">Tabel Kunjungan</h3>
          <select 
            className="bg-[#4a5d29] border border-white/20 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
          >
            <option value="" className="text-slate-800">Semua Kelas</option>
            {uniqueClasses.map(c => <option key={c} value={c} className="text-slate-800">Kelas {c}</option>)}
          </select>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {filteredTransactions.length > 0 ? (
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {filteredTransactions.map((tx, idx) => (
                <div key={`${tx.id}-${idx}`} className="space-y-1">
                  <div className="bg-[#E0F2F1] px-4 py-2 rounded-lg">
                    <p className="font-black text-slate-800 text-sm sm:text-base flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <ChevronRight size={16} className="text-slate-400" /> {tx.namaSiswa}
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider">
                        {visitCounts[tx.namaSiswa] || 0} Kunjungan
                      </span>
                    </p>
                  </div>
                  <div className="pl-8 space-y-1">
                    <p className="text-sm font-black text-slate-700 flex items-center gap-2">
                      <ChevronRight size={14} className="text-slate-300" /> {tx.kelas}
                    </p>
                    <div className="pl-6 space-y-1">
                      <p className="text-sm text-slate-900 font-bold flex items-center gap-2 italic">
                        <ChevronRight size={14} className="text-slate-400" /> {tx.keluhan}
                      </p>
                      <div className="pl-6 space-y-1">
                        <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <ChevronRight size={14} className="text-slate-200" /> {tx.penanganan}
                        </p>
                        {tx.obat && tx.obat.length > 0 && (
                          <div className="pl-6 space-y-1">
                            {tx.obat.map((o, oi) => (
                              <p key={oi} className="text-xs text-slate-500 flex items-center gap-2">
                                <ChevronRight size={12} className="text-slate-200" /> {o.nama} ({o.jumlah})
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="pl-6 text-[10px] sm:text-xs text-slate-700 font-bold font-mono mt-1">
                          {tx.tanggal.replace('T', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 italic">
              Tidak ada data kunjungan untuk ditampilkan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Master Siswa Component ---
const MasterSiswa: React.FC<{ db: AppDatabase, searchTerm: string }> = ({ db, searchTerm }) => {
  const filteredSiswa = db.siswa.filter(s => s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || s.kelas.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const addSiswa = async () => {
    const { value: v } = await Swal.fire({ 
      title: 'Tambah Siswa', 
      html: '<input id="i1" class="swal2-input" placeholder="Nama"><input id="i2" class="swal2-input" placeholder="Kelas">', 
      preConfirm: () => [(document.getElementById('i1') as HTMLInputElement).value, (document.getElementById('i2') as HTMLInputElement).value], 
      customClass:{popup:'rounded-3xl'} 
    });
    
    if (v && v[0] && v[1]) {
      try {
        await addDoc(collection(firestore, 'students'), {
          name: v[0],
          class: v[1],
          gender: 'Laki-laki' // Default
        });
        Swal.fire('Berhasil', 'Siswa ditambahkan', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'students');
      }
    }
  };

  const deleteSiswa = async (id: string | number) => {
    const res = await Swal.fire({
      title: 'Hapus Siswa?',
      text: "Data ini tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(firestore, 'students', id.toString()));
        Swal.fire('Terhapus', '', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
      }
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Data Peserta Didik</h2>
        <button onClick={addSiswa} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-bold shadow-md transition hover:bg-blue-700"><Plus size={16}/> Tambah</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b"><tr><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">ID</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Nama</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Kelas</th><th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase">Aksi</th></tr></thead>
            <tbody className="divide-y divide-gray-50">{filteredSiswa.map((s, i) => (<tr key={`${s.id}-${i}`} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono text-xs">{i+1}</td><td className="px-4 py-3 font-bold text-slate-700">{s.nama}</td><td className="px-4 py-3"><span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-black">{s.kelas}</span></td><td className="px-4 py-3 text-right"><button onClick={() => deleteSiswa(s.id)} className="text-rose-400 hover:text-rose-600 p-1.5"><Trash2 size={16}/></button></td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Master Obat Component ---
const MasterObat: React.FC<{ db: AppDatabase, searchTerm: string }> = ({ db, searchTerm }) => {
  const filteredObat = db.obat.filter(o => o.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const addObat = async () => {
    const { value: v } = await Swal.fire({ 
      title: 'Tambah Obat', 
      html: '<input id="i1" class="swal2-input" placeholder="Nama"><input id="i2" type="number" class="swal2-input" placeholder="Stok">', 
      preConfirm: () => [(document.getElementById('i1') as HTMLInputElement).value, (document.getElementById('i2') as HTMLInputElement).value] 
    });
    
    if (v && v[0]) {
      try {
        await addDoc(collection(firestore, 'medicines'), {
          nama: v[0],
          stok: parseInt(v[1] || '0')
        });
        Swal.fire('Berhasil', 'Obat ditambahkan', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'medicines');
      }
    }
  };

  const deleteObat = async (id: string | number) => {
    const res = await Swal.fire({
      title: 'Hapus Obat?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(firestore, 'medicines', id.toString()));
        Swal.fire('Terhapus', '', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `medicines/${id}`);
      }
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Persediaan Obat</h2>
        <button onClick={addObat} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-bold shadow-md transition hover:bg-blue-700"><Plus size={16}/> Tambah</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredObat.map((o, i) => (
          <div key={`${o.id}-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 group transition hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className={`p-2.5 rounded-xl ${o.stok < 3 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}><Pill size={20}/></div>
              <button onClick={() => deleteObat(o.id)} className="text-rose-400 p-1.5"><Trash2 size={16}/></button>
            </div>
            <div className="mt-3"><h4 className="font-bold text-slate-800 text-sm truncate">{o.nama}</h4><div className="flex items-center justify-between mt-1.5"><span className="text-xl font-black text-slate-800">{o.stok}</span><span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${o.stok < 3 ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>{o.stok < 3 ? 'KRITIS' : 'STABIL'}</span></div></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Form Transaksi Component ---
const FormTransaksi: React.FC<{ db: AppDatabase, onPreview: (d: Transaction) => void }> = ({ db, onPreview }) => {
  const [f, setF] = useState({ tgl: new Date().toISOString().slice(0, 16), kls: '', sid: '', kel: 'Pusing', kl: '', pen: 'Istirahat' });
  const [ou, setOu] = useState<{id: string | number, qty: number}[]>([]);
  const classes = [...new Set(db.siswa.map(s => s.kelas))].sort();

  const handleProcess = async (isPreview: boolean = false) => {
    const s = db.siswa.find(x => x.id.toString() === f.sid);
    if (!s) return Swal.fire('Pilih Siswa!', '', 'warning');
    
    const batch = writeBatch(firestore);
    const obatList: { nama: string; jumlah: number }[] = [];

    ou.forEach(item => {
      const m = db.obat.find(o => o.id.toString() === item.id.toString());
      if (m) {
        const medicineRef = doc(firestore, 'medicines', m.id.toString());
        batch.update(medicineRef, { stok: m.stok - item.qty });
        obatList.push({ nama: m.nama, jumlah: item.qty });
      }
    });

    const det = obatList.map(o => `${o.nama} (${o.jumlah})`).join(', ');

    const txData = { 
      studentId: s.id.toString(),
      studentName: s.nama,
      studentClass: f.kls,
      complaint: f.kel === 'Lainya' ? f.kl : f.kel,
      treatment: f.pen,
      timestamp: f.tgl + ":00Z", // Ensure valid date string
      status: f.pen === 'Pulang' ? 'Rujuk' : 'Kembali ke Kelas',
      obatDetail: det,
      obat: obatList
    };
    
    if (isPreview) {
      onPreview({ 
        ...txData, 
        id: 'preview', 
        tanggal: f.tgl,
        namaSiswa: s.nama,
        kelas: f.kls,
        keluhan: txData.complaint,
        penanganan: txData.treatment
      } as unknown as Transaction);
    } else {
      try {
        const visitRef = doc(collection(firestore, 'visits'));
        batch.set(visitRef, txData);
        await batch.commit();
        Swal.fire('Tersimpan', '', 'success');
        resetForm();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'visits');
      }
    }
  };

  const resetForm = () => {
    setF({ ...f, sid: '', kl: '', pen: 'Istirahat' });
    setOu([]);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pemeriksaan UKS</h2>
      <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-xl border border-blue-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users size={14}/> Identitas</h4>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-slate-500">Waktu</label><input type="datetime-local" className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm" value={f.tgl} onChange={e => setF({...f, tgl: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-slate-500">Kelas</label><select className="w-full p-3 bg-slate-50 rounded-xl text-sm" value={f.kls} onChange={e => setF({...f, kls: e.target.value, sid: ''})}><option value="">Pilih</option>{classes.map((c, i) => <option key={`${c}-${i}`} value={c}>{c}</option>)}</select></div>
                <div><label className="text-[10px] font-bold text-slate-500">Siswa</label><select className="w-full p-3 bg-slate-50 rounded-xl text-sm" value={f.sid} onChange={e => setF({...f, sid: e.target.value})}><option value="">Pilih</option>{db.siswa.filter(x => x.kelas === f.kls).map((x, i) => <option key={`${x.id}-${i}`} value={x.id}>{x.nama}</option>)}</select></div>
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Stethoscope size={14}/> Diagnosa</h4>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-slate-500">Keluhan</label><select className="w-full p-3 bg-slate-50 rounded-xl text-sm" value={f.kel} onChange={e => setF({...f, kel: e.target.value})}><option value="Pusing">Pusing</option><option value="Mual">Mual</option><option value="Demam">Demam</option><option value="Lainya">Lainya</option></select></div>
              <div><label className="text-[10px] font-bold text-slate-500">Penanganan</label><select className="w-full p-3 bg-slate-50 rounded-xl text-sm" value={f.pen} onChange={e => setF({...f, pen: e.target.value})}><option value="Istirahat">Istirahat</option><option value="Minum Obat">Minum Obat</option><option value="Pulang">Pulang (Surat Izin)</option></select></div>
            </div>
          </div>
          <div className="md:col-span-2 bg-blue-600 p-6 rounded-[24px] shadow-2xl">
            <div className="flex justify-between items-center text-white mb-4 font-black"><h4 className="text-sm flex items-center gap-2"><Pill size={18}/> Penggunaan Obat</h4><button type="button" onClick={() => setOu([...ou, {id:'', qty:1}])} className="bg-white/20 px-3 py-1.5 rounded-lg text-[10px]">+ OBAT</button></div>
            {ou.map((row, i) => (<div key={i} className="flex gap-2 mb-2"><select className="flex-1 p-2.5 rounded-xl text-sm" value={row.id} onChange={e => { const n = [...ou]; n[i].id = e.target.value; setOu(n); }}><option value="">Pilih Obat</option>{db.obat.map((o, idx) => <option key={`${o.id}-${idx}`} value={o.id}>{o.nama}</option>)}</select><input type="number" className="w-16 p-2.5 rounded-xl text-center text-sm" value={row.qty} onChange={e => { const n = [...ou]; n[i].qty = parseInt(e.target.value || '1'); setOu(n); }} /><button type="button" onClick={() => setOu(ou.filter((_, idx) => idx !== i))} className="bg-rose-500 text-white p-2.5 rounded-xl"><Trash2 size={16}/></button></div>))}
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            {f.pen === 'Pulang' && <button type="button" onClick={() => handleProcess(true)} className="bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg hover:bg-slate-900 transition flex items-center gap-2"><Printer size={16}/> PREVIEW IZIN</button>}
            <button type="button" onClick={() => handleProcess(false)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg hover:bg-blue-700 transition">SIMPAN REKAM MEDIS</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- RekapKunjungan & Arsip Component ---
const RekapKunjungan: React.FC<{ db: AppDatabase, searchTerm: string, onPreview: (d: Transaction) => void }> = ({ db, searchTerm, onPreview }) => {
  const filteredTx = db.transaksi.filter(tx => tx.namaSiswa.toLowerCase().includes(searchTerm.toLowerCase()) || tx.keluhan.toLowerCase().includes(searchTerm.toLowerCase()) || tx.penanganan.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleEdit = async (tx: Transaction) => {
    const { value: v } = await Swal.fire({
      title: 'Edit Rekam Medis',
      html: `<input id="sw1" type="datetime-local" class="swal2-input" value="${tx.tanggal.slice(0, 16)}"><input id="sw2" class="swal2-input" placeholder="Keluhan" value="${tx.keluhan}"><input id="sw3" class="swal2-input" placeholder="Penanganan" value="${tx.penanganan}"><input id="sw4" class="swal2-input" placeholder="Obat" value="${tx.obatDetail}">`,
      preConfirm: () => [(document.getElementById('sw1') as HTMLInputElement).value, (document.getElementById('sw2') as HTMLInputElement).value, (document.getElementById('sw3') as HTMLInputElement).value, (document.getElementById('sw4') as HTMLInputElement).value]
    });
    if (v) {
      try {
        await updateDoc(doc(firestore, 'visits', tx.id.toString()), {
          timestamp: v[0] + ":00Z",
          complaint: v[1],
          treatment: v[2],
          obatDetail: v[3]
        });
        Swal.fire('Terupdate', '', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `visits/${tx.id}`);
      }
    }
  };

  const deleteVisit = async (id: string | number) => {
    const res = await Swal.fire({
      title: 'Hapus Rekam Medis?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(firestore, 'visits', id.toString()));
        Swal.fire('Terhapus', '', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `visits/${id}`);
      }
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Rekap Kunjungan & Arsip</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group transition hover:border-blue-200">
          <h4 className="font-bold text-slate-800 text-sm mb-1">Kunjungan UKS</h4>
          <button onClick={() => {
            const ws = XLSX.utils.json_to_sheet(db.transaksi);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Kunjungan");
            XLSX.writeFile(wb, "Kunjungan_UKS.xlsx");
          }} className="w-full mt-3 bg-blue-600 text-white py-2.5 rounded-xl text-xs flex justify-center items-center gap-2 font-black shadow-md"><Download size={16}/> EKSPOR XLSX</button>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group transition hover:border-emerald-200">
          <h4 className="font-bold text-slate-800 text-sm mb-1">Stok Obat</h4>
          <button onClick={() => {
            const ws = XLSX.utils.json_to_sheet(db.obat);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stok_Obat");
            XLSX.writeFile(wb, "Stok_Obat.xlsx");
          }} className="w-full mt-3 bg-emerald-600 text-white py-2.5 rounded-xl text-xs flex justify-center items-center gap-2 font-black shadow-md"><Download size={16}/> EKSPOR XLSX</button>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group transition hover:border-purple-200">
          <h4 className="font-bold text-slate-800 text-sm mb-1">Hasil Screening</h4>
          <button onClick={() => {
            const ws = XLSX.utils.json_to_sheet(db.screening);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Screening");
            XLSX.writeFile(wb, "Screening_Siswa.xlsx");
          }} className="w-full mt-3 bg-purple-600 text-white py-2.5 rounded-xl text-xs flex justify-center items-center gap-2 font-black shadow-md"><Download size={16}/> EKSPOR XLSX</button>
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-slate-50 p-4 sm:p-5 border-b flex justify-between items-center text-xs font-black text-slate-800">ARSIP 50 KEJADIAN TERAKHIR</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-100/50"><tr className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-4 py-3 text-left">Waktu</th><th className="px-4 py-3 text-left">Nama Siswa</th><th className="px-4 py-3 text-left">Kelas</th><th className="px-4 py-3 text-left">Keluhan</th><th className="px-4 py-3 text-right print:hidden">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-50">{filteredTx.slice(0, 50).map((tx, i) => (
              <tr key={`${tx.id}-${i}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-400 font-mono text-[10px] sm:text-xs">{tx.tanggal.replace('T', ' ')}</td>
                <td className="px-4 py-3 font-bold text-slate-700">{tx.namaSiswa}</td>
                <td className="px-4 py-3 font-bold text-slate-500">{tx.kelas}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-[9px] sm:text-[10px] font-black text-slate-600">{tx.keluhan.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-right print:hidden flex justify-end gap-1">
                  {tx.penanganan.includes('Pulang') && (
                    <button onClick={() => onPreview(tx)} className="text-slate-400 hover:text-slate-800 p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition" title="Print Preview">
                      <FileBadge size={14}/>
                    </button>
                  )}
                  <button onClick={() => handleEdit(tx)} className="text-blue-400 hover:text-blue-600 p-1.5"><Edit size={14}/></button>
                  <button onClick={() => deleteVisit(tx.id)} className="text-rose-400 hover:text-rose-600 p-1.5"><Trash2 size={14}/></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Screening Component ---
const ScreeningPage: React.FC<{ db: AppDatabase }> = ({ db }) => {
  const [scForm, setScForm] = useState({ tanggal: new Date().toISOString().split('T')[0], kelas: '', siswaId: '', hasil: 'Sehat' as any, keluhan: '', dokter: '' });
  const uniqueClasses = [...new Set(db.siswa.map(s => s.kelas))].sort();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = db.siswa.find(x => x.id.toString() === scForm.siswaId);
    if (!s) return;
    
    try {
      await addDoc(collection(firestore, 'screening'), {
        tanggal: scForm.tanggal,
        studentId: s.id,
        namaSiswa: s.nama,
        kelas: s.kelas,
        hasil: scForm.hasil,
        keluhan: scForm.keluhan,
        dokter: scForm.dokter
      });
      Swal.fire('Berhasil', 'Data screening disimpan', 'success');
      setScForm({ ...scForm, siswaId: '', keluhan: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'screening');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Screening Kesehatan</h2>
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-purple-50">
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-purple-600 uppercase">Informasi</h4>
            <input type="date" className="w-full p-2.5 bg-slate-50 rounded-xl text-sm" value={scForm.tanggal} onChange={e => setScForm({...scForm, tanggal: e.target.value})} />
            <select className="w-full p-2.5 bg-slate-50 rounded-xl text-sm" value={scForm.kelas} onChange={e => setScForm({...scForm, kelas: e.target.value, siswaId: ''})}><option value="">Pilih Kelas</option>{uniqueClasses.map((c, i) => <option key={`${c}-${i}`} value={c}>{c}</option>)}</select>
            <select className="w-full p-2.5 bg-slate-50 rounded-xl text-sm" value={scForm.siswaId} onChange={e => setScForm({...scForm, siswaId: e.target.value})}><option value="">Pilih Siswa</option>{db.siswa.filter(x => x.kelas === scForm.kelas).map((x, i) => <option key={`${x.id}-${i}`} value={x.id}>{x.nama}</option>)}</select>
          </div>
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-purple-600 uppercase">Evaluasi</h4>
            <select className="w-full p-2.5 bg-slate-50 rounded-xl text-sm" value={scForm.hasil} onChange={e => setScForm({...scForm, hasil: e.target.value as any})}><option value="Sehat">Sehat</option><option value="Perlu Pemantauan">Perlu Pemantauan</option><option value="Perlu Rujukan">Perlu Rujukan</option></select>
            <input type="text" className="w-full p-2.5 bg-slate-50 rounded-xl text-sm" placeholder="Catatan/Keluhan" value={scForm.keluhan} onChange={e => setScForm({...scForm, keluhan: e.target.value})} />
            <input type="text" className="w-full p-2.5 bg-slate-50 rounded-xl text-sm" placeholder="Petugas Pemeriksa" value={scForm.dokter} onChange={e => setScForm({...scForm, dokter: e.target.value})} />
            <button type="submit" className="w-full bg-purple-600 text-white p-3 rounded-xl text-sm font-bold shadow-md hover:bg-purple-700 transition">Simpan Screening</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Pengaturan Component ---
const Pengaturan: React.FC<{ db: AppDatabase, onLogout: () => void, userRole: 'admin' | 'viewer' | null }> = ({ db, onLogout, userRole }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (userRole !== 'admin') return;
    setLoadingUsers(true);
    const unsub = onSnapshot(collection(firestore, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingUsers(false);
    });
    return () => unsub();
  }, [userRole]);

  const handleAddUser = async () => {
    const { value: v } = await Swal.fire({
      title: 'Tambah Pengguna',
      html: `
        <input id="u_email" class="swal2-input" placeholder="Email Google">
        <select id="u_role" class="swal2-input">
          <option value="admin">Admin (Akses Penuh)</option>
          <option value="viewer">Viewer (Hanya Lihat)</option>
        </select>
      `,
      preConfirm: () => [
        (document.getElementById('u_email') as HTMLInputElement).value,
        (document.getElementById('u_role') as HTMLSelectElement).value
      ]
    });

    if (v && v[0]) {
      try {
        const email = v[0].toLowerCase().trim();
        await setDoc(doc(firestore, 'users', email), {
          email: email,
          role: v[1],
          addedAt: new Date().toISOString()
        });
        Swal.fire('Berhasil', 'Pengguna ditambahkan. Mereka harus login dengan email tersebut.', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'users');
      }
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (email === "wiwikismiati61@guru.smp.belajar.id") {
      return Swal.fire('Error', 'Admin utama tidak bisa dihapus.', 'error');
    }

    const res = await Swal.fire({
      title: 'Hapus Akses?',
      text: `Hapus akses untuk ${email}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(firestore, 'users', id));
        Swal.fire('Terhapus', '', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
      }
    }
  };
  const handleBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `UKS_SMPN7_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    Swal.fire({ icon: 'success', title: 'Backup Berhasil', text: 'File cadangan (.json) telah diunduh.', timer: 1500, showConfirmButton: false });
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.siswa && json.obat) {
          const allOps: { ref: any, data: any }[] = [];
          
          json.siswa.forEach((s: any) => {
            allOps.push({
              ref: doc(collection(firestore, 'students')),
              data: { 
                name: String(s.nama || ''), 
                class: String(s.kelas || ''), 
                gender: s.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
                healthNotes: String(s.healthNotes || '')
              }
            });
          });

          json.obat.forEach((o: any) => {
            allOps.push({
              ref: doc(collection(firestore, 'medicines')),
              data: { 
                nama: String(o.nama || ''), 
                stok: Number(o.stok) || 0 
              }
            });
          });

          if (json.transaksi) {
            json.transaksi.forEach((t: any) => {
              let status = 'Kembali ke Kelas';
              if (t.status === 'Istirahat' || t.status === 'Rujuk') status = t.status;
              
              allOps.push({
                ref: doc(collection(firestore, 'visits')),
                data: {
                  studentId: String(t.studentId || 'migrated'),
                  studentName: String(t.namaSiswa || ''),
                  studentClass: String(t.kelas || ''),
                  complaint: String(t.keluhan || ''),
                  treatment: String(t.penanganan || ''),
                  timestamp: String(t.tanggal || new Date().toISOString()),
                  status: status,
                  obatDetail: String(t.obatDetail || ''),
                  obat: Array.isArray(t.obat) ? t.obat : []
                }
              });
            });
          }

          if (json.screening) {
            json.screening.forEach((sc: any) => {
              let hasil = 'Sehat';
              if (sc.hasil === 'Perlu Pemantauan' || sc.hasil === 'Perlu Rujukan') hasil = sc.hasil;

              allOps.push({
                ref: doc(collection(firestore, 'screening')),
                data: {
                  tanggal: String(sc.tanggal || new Date().toISOString()),
                  studentId: String(sc.studentId || 'migrated'),
                  namaSiswa: String(sc.namaSiswa || ''),
                  kelas: String(sc.kelas || ''),
                  hasil: hasil,
                  keluhan: String(sc.keluhan || ''),
                  dokter: String(sc.dokter || '')
                }
              });
            });
          }

          // Chunk operations into batches of 500
          for (let i = 0; i < allOps.length; i += 500) {
            const batch = writeBatch(firestore);
            const chunk = allOps.slice(i, i + 500);
            chunk.forEach(op => batch.set(op.ref, op.data));
            try {
              await batch.commit();
            } catch (batchErr) {
              console.error(`Batch starting at index ${i} failed:`, batchErr);
              throw batchErr;
            }
          }
          
          Swal.fire('Restorasi Berhasil', `Berhasil mengimpor ${allOps.length} data ke Cloud.`, 'success');
        } else {
          throw new Error('Format database tidak valid');
        }
      } catch (err) {
        console.error(err);
        handleFirestoreError(err, OperationType.WRITE, 'restore');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => { 
    Swal.fire({ 
      title: 'Hapus Semua Data?', 
      text: "Tindakan ini akan mengosongkan seluruh isi database secara permanen!", 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Reset Sekarang' 
    }).then(async (r) => { 
      if (r.isConfirmed) {
        // Resetting Firestore is complex (needs to delete all docs)
        // For now, we'll just inform the user or implement a basic version
        Swal.fire('Info', 'Reset database Cloud harus dilakukan melalui Firebase Console untuk keamanan.', 'info');
      }
    }); 
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-slate-800 text-sm mb-5 flex items-center gap-2"><Settings size={18}/> Akun Anda</h3>
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 uppercase font-black mb-1">Email Terhubung</p>
              <p className="text-sm font-bold text-slate-800">{auth.currentUser?.email}</p>
              <p className="text-[10px] mt-1 font-black text-blue-600 uppercase">Role: {userRole?.toUpperCase()}</p>
            </div>
            <button onClick={onLogout} className="bg-rose-600 text-white py-3 rounded-xl text-sm font-black w-full shadow-md hover:bg-rose-700 transition flex items-center justify-center gap-2">
              <LogOut size={18}/> Keluar (Logout)
            </button>
          </div>
        </div>

        {userRole === 'admin' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Users size={18} className="text-blue-600"/> Manajemen Pengguna & Izin</h3>
              <button onClick={handleAddUser} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition">
                <Plus size={14}/> Tambah User
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[10px] font-black text-slate-400 uppercase">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-700">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteUser(u.id, u.email)} className="text-rose-400 hover:text-rose-600 p-1.5">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loadingUsers && (
                    <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400 italic">Belum ada pengguna tambahan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {userRole === 'admin' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2"><Download size={18} className="text-emerald-500"/> Pemeliharaan Data</h3>
            <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">Cadangkan data secara rutin ke dalam file .json untuk mencegah kehilangan data jika cache browser dibersihkan.</p>
            <div className="space-y-3 mt-auto">
              <button onClick={handleBackup} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm flex justify-center items-center gap-2 font-black hover:bg-emerald-700 transition shadow-md">
                <Download size={16}/> Download Backup (.json)
              </button>
              <label className="w-full bg-slate-800 text-white py-3 rounded-xl text-sm flex justify-center items-center gap-2 font-black cursor-pointer hover:bg-slate-900 transition shadow-md">
                <Upload size={16}/> Restore dari Backup
                <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
              </label>
            </div>
          </div>
        )}

        {userRole === 'admin' && (
          <div className="md:col-span-2 bg-rose-50 p-6 rounded-2xl border border-rose-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-rose-800 text-sm mb-1 flex items-center gap-2"><AlertTriangle size={18}/> Bahaya: Reset Database</h3>
              <p className="text-[10px] text-rose-700 opacity-70 font-bold">Tindakan ini akan menghapus semua catatan medis, stok obat, dan data siswa secara permanen!</p>
            </div>
            <button onClick={handleReset} className="bg-rose-600 text-white px-6 py-3 rounded-xl text-sm font-black shadow-md hover:bg-rose-700 transition whitespace-nowrap">
              Reset Factory Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'viewer' | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [db, setDb] = useState<AppDatabase>(DEFAULT_DB);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewData, setPreviewData] = useState<Transaction | null>(null);

  // --- Firebase Auth & Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch user role
        const adminEmails = [
          'wiwikismiati61@guru.smp.belajar.id',
          'wiwikismiati61@admin.smp.belajar.id',
          'wiwikismiati61@smp.belajar.id',
          'wiwikismiati61@gmail.com',
          'siti.nafisah5251@guru.smp.belajar.id',
          'siti.nafisah5251@admin.smp.belajar.id',
          'siti.nafisah5251@smp.belajar.id',
          'siti.nafisah5251@gmail.com',
          'siti.nafisa5251@guru.smp.belajar.id',
          'siti.nafisa5251@admin.smp.belajar.id',
          'siti.nafisa5251@smp.belajar.id',
          'ekispd42@guru.smp.belajar.id',
          'mayasari66@guru.smp.belajar.id',
          'mohammadsyaikhu62@guru.smp.belajar.id'
        ].map(e => e.toLowerCase().trim());

        const adminUIDs = [
          'IT6wnomzqWWGi5jYTXaohjGtVpu2' // UID Ibu Siti dari Debug Info
        ];

        // Ambil email dari provider data jika u.email null (terjadi pada beberapa akun sekolah)
        let userEmail = (u.email || '').toLowerCase().trim();
        if (!userEmail && u.providerData && u.providerData.length > 0) {
          userEmail = (u.providerData[0].email || '').toLowerCase().trim();
        }

        const isHardcodedAdmin = adminEmails.includes(userEmail) || adminUIDs.includes(u.uid);

        if (isHardcodedAdmin) {
          setUserRole('admin');
          console.log("User identified as hardcoded admin:", userEmail || u.uid);
        }

        // Fetch user role from database to sync
        try {
          // Check by UID first, then by Email
          let userDoc = await getDocFromServer(doc(firestore, 'users', u.uid));
          let currentUserData = userDoc.exists() ? userDoc.data() : null;
          
          if (!currentUserData && u.email) {
            userDoc = await getDocFromServer(doc(firestore, 'users', u.email.toLowerCase()));
            currentUserData = userDoc.exists() ? userDoc.data() : null;
            
            if (currentUserData) {
              // If found by email, migrate to UID for better security/performance in future
              await setDoc(doc(firestore, 'users', u.uid), {
                ...currentUserData,
                uid: u.uid,
                displayName: u.displayName
              });
            }
          }
          
          if (isHardcodedAdmin) {
            // Ensure database record is also 'admin'
            if (!currentUserData || currentUserData.role !== 'admin') {
              try {
                await setDoc(doc(firestore, 'users', u.uid), {
                  email: userEmail,
                  role: 'admin',
                  displayName: u.displayName || userEmail.split('@')[0] || 'Admin',
                  uid: u.uid,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              } catch (dbErr: any) {
                console.warn("Failed to update admin role in database, but UI access is granted:", dbErr);
                // Don't show error to user here as they still have UI access
              }
            }
          } else if (currentUserData) {
            setUserRole(currentUserData.role || 'viewer');
          } else {
            setUserRole('viewer');
          }
        } catch (err: any) {
            console.error("Error fetching user role:", err);
            // If it's a permission error, it might be because the user isn't an admin in rules
            if (err.code === 'permission-denied') {
              console.warn("Permission denied while fetching role. Defaulting to viewer.");
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Gagal Memuat Peran',
                text: `Terjadi kesalahan saat mengambil data pengguna: ${err.message}. Silakan coba muat ulang halaman.`,
                confirmButtonText: 'Muat Ulang'
              }).then((result) => {
                if (result.isConfirmed) window.location.reload();
              });
            }
            if (!isHardcodedAdmin) setUserRole('viewer');
          }
      } else {
        setUserRole(null);
      }
      setIsAuthReady(true);
    });

    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    handleResize();

    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(firestore, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // --- Real-time Sync ---
  useEffect(() => {
    const unsubSiswa = onSnapshot(collection(firestore, 'students'), (snapshot) => {
      const siswa = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          nama: data.name || '', 
          kelas: data.class || '' 
        } as unknown as Student;
      });
      setDb(prev => ({ ...prev, siswa }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    const unsubObat = onSnapshot(collection(firestore, 'medicines'), (snapshot) => {
      const obat = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as Medicine));
      setDb(prev => ({ ...prev, obat }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'medicines'));

    const unsubTransaksi = onSnapshot(query(collection(firestore, 'visits'), orderBy('timestamp', 'desc')), (snapshot) => {
      const transaksi = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          ...data, 
          id: doc.id,
          tanggal: data.timestamp || '',
          namaSiswa: data.studentName || '',
          kelas: data.studentClass || '',
          keluhan: data.complaint || '',
          penanganan: data.treatment || '',
          obatDetail: data.obatDetail || '',
          obat: data.obat || []
        } as unknown as Transaction;
      });
      setDb(prev => ({ ...prev, transaksi }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'visits'));

    const unsubScreening = onSnapshot(collection(firestore, 'screening'), (snapshot) => {
      const screening = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as Screening));
      setDb(prev => ({ ...prev, screening }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'screening'));

    return () => {
      unsubSiswa();
      unsubObat();
      unsubTransaksi();
      unsubScreening();
    };
  }, []);

  // --- Migration Logic ---
  useEffect(() => {
    const migrateData = async () => {
      if (!user) return;
      const hasMigrated = localStorage.getItem('uks_migrated');
      if (hasMigrated) return;

      const localData = localStorage.getItem('uks_db');
      if (!localData) {
        localStorage.setItem('uks_migrated', 'true');
        return;
      }

      const parsed: AppDatabase = JSON.parse(localData);
      const batch = writeBatch(firestore);

      // Check if Firestore is empty before migrating
      const siswaSnap = await getDocs(collection(firestore, 'students'));
      if (siswaSnap.empty) {
        parsed.siswa.forEach(s => {
          const ref = doc(collection(firestore, 'students'));
          batch.set(ref, { name: s.nama, class: s.kelas, gender: 'Laki-laki' }); // Default gender
        });
        parsed.obat.forEach(o => {
          const ref = doc(collection(firestore, 'medicines'));
          batch.set(ref, { nama: o.nama, stok: o.stok });
        });
        parsed.transaksi.forEach(t => {
          const ref = doc(collection(firestore, 'visits'));
          batch.set(ref, {
            studentId: 'migrated',
            studentName: t.namaSiswa,
            studentClass: t.kelas,
            complaint: t.keluhan,
            treatment: t.penanganan,
            timestamp: t.tanggal,
            status: 'Kembali ke Kelas'
          });
        });
        
        await batch.commit();
        Swal.fire('Migrasi Berhasil', 'Data dari penyimpanan lokal telah dipindahkan ke Cloud.', 'success');
      }
      
      localStorage.setItem('uks_migrated', 'true');
    };

    if (user) migrateData();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      Swal.fire({ icon: 'success', title: 'Selamat Datang!', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      console.error(error);
      let msg = 'Gagal masuk dengan Google.';
      if (error.code === 'auth/unauthorized-domain') {
        msg = 'Domain ini belum diizinkan di Firebase Console. Silakan tambahkan ' + window.location.hostname + ' ke Authorized Domains.';
      } else if (error.code === 'auth/popup-blocked') {
        msg = 'Popup login terblokir oleh browser. Silakan izinkan popup untuk situs ini.';
      }
      Swal.fire('Login Gagal', msg, 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActivePage('dashboard');
  };

  const saveToStorage = useCallback(async (newDb: AppDatabase) => { 
    // This is now mostly for local state updates if needed, 
    // but we primarily use Firestore.
    setDb(newDb); 
  }, []);

  const handleRealPrint = () => {
    if (!previewData) return;
    
    // Check if this is a NEW transaction (not yet in db)
    const exists = db.transaksi.some(t => t.id === previewData.id);
    if (!exists) {
      // Logic for stock deduction should be consistent
      // But for simplicity of this preview-first flow:
      // We assume it's already deducted if called from handleProcess(false)
      // If called from a new record flow, we save it here.
      // But the current implementation saves the record only after "Simpan" or "Cetak"
      // Let's refine FormTransaksi logic to save BEFORE preview or DURING print.
      
      // Let's stick to simple: The user must click "Simpan" to record, 
      // or "Preview" only looks at it. 
      // Correct flow: "Preview" shows what WILL be printed. 
      // Printing from preview will also SAVE it if it's new.
      
      saveToStorage({ ...db, transaksi: [previewData, ...db.transaksi] });
    }

    setTimeout(() => {
      window.print();
      setPreviewData(null);
    }, 200);
  };

  const renderContent = () => {
    if (activePage === 'dashboard') {
      return <Dashboard db={db} setActivePage={setActivePage} userRole={userRole} />;
    }

    if (!user) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-150px)]">
          <div className="bg-white p-10 rounded-[40px] shadow-xl w-full max-w-md border border-slate-100">
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-blue-600 rounded-3xl mb-4 shadow-lg shadow-blue-200"><Settings size={40} className="text-white"/></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Login Sistem UKS</h2>
              <p className="text-xs text-slate-500 mt-2">Silakan login dengan akun Google Anda untuk mengakses sistem.</p>
            </div>
            <button 
              onClick={handleLogin} 
              className="w-full bg-white border-2 border-slate-100 text-slate-700 font-black py-4 rounded-2xl shadow-sm hover:bg-slate-50 transition active:scale-95 text-sm flex items-center justify-center gap-3"
            >
              <LogIn size={20} className="text-blue-600" /> Masuk dengan Google
            </button>
            <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[10px] text-blue-700 font-bold text-center leading-relaxed">
                Hanya pengguna terdaftar yang dapat melakukan perubahan data. Pengguna lain hanya dapat melihat dashboard.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (userRole === 'viewer' && activePage !== 'dashboard') {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] text-center p-6">
          <div className="p-6 bg-amber-50 rounded-full text-amber-500 mb-6">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Akses Terbatas</h2>
          <p className="text-sm text-slate-500 max-w-md">
            Akun Anda ({user.email}) belum terdaftar sebagai Admin. Anda hanya memiliki izin untuk melihat Dashboard.
          </p>
          <div className="flex gap-4 mt-6">
            <button 
              onClick={() => setActivePage('dashboard')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition"
            >
              Kembali ke Dashboard
            </button>
            <button 
              onClick={() => Swal.fire({
                title: 'Info Debugging',
                html: `<div class="text-left text-xs font-mono bg-slate-100 p-4 rounded-lg">
                  Email: ${user.email}<br/>
                  UID: ${user.uid}<br/>
                  Role: ${userRole}
                </div>`,
                confirmButtonText: 'Tutup'
              })}
              className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
            >
              Info Debug
            </button>
          </div>
        </div>
      );
    }

    switch (activePage) {
      case 'master-siswa': return <MasterSiswa db={db} searchTerm={searchTerm} />;
      case 'master-obat': return <MasterObat db={db} searchTerm={searchTerm} />;
      case 'transaksi': return <FormTransaksi db={db} onPreview={setPreviewData} />;
      case 'screening': return <ScreeningPage db={db} />;
      case 'laporan': return <RekapKunjungan db={db} searchTerm={searchTerm} onPreview={setPreviewData} />;
      case 'pengaturan': return <Pengaturan db={db} onLogout={handleLogout} userRole={userRole} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden font-['Poppins']">
      
      {/* --- HIDDEN PRINT DIV --- */}
      {previewData && (
        <div className="hidden print:block">
          <SuratIzinContent data={previewData} />
        </div>
      )}

      {/* --- PRINT PREVIEW MODAL --- */}
      {previewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
              <h3 className="font-black text-slate-800 flex items-center gap-2"><Eye size={20} className="text-blue-600"/> Pratinjau Surat Izin</h3>
              <button onClick={() => setPreviewData(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 sm:p-10 max-h-[70vh] overflow-y-auto bg-slate-100 flex justify-center">
              <div className="shadow-2xl transform scale-95 sm:scale-100 origin-top">
                <SuratIzinContent data={previewData} />
              </div>
            </div>

            <div className="p-8 bg-white border-t flex flex-col sm:flex-row gap-4">
              <button onClick={() => setPreviewData(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition">Tutup Pratinjau</button>
              <button onClick={handleRealPrint} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition flex items-center justify-center gap-3">
                <Printer size={20}/> CETAK SEKARANG
              </button>
            </div>
          </div>
        </div>
      )}
      
      <aside className={`bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed h-full z-40 shadow-2xl print:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:w-72`}>
        <div className="p-6 flex items-center gap-4 border-b border-slate-800 mb-4 lg:flex-col lg:p-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4"><Stethoscope size={24}/></div>
          <h2 className="text-xl font-black text-white tracking-tighter lg:block">UKS SMPN 7</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', icon: <LayoutDashboard size={20}/>, label: 'Dashboard', roles: ['admin', 'viewer'] },
            { id: 'master-siswa', icon: <Users size={20}/>, label: 'Siswa', roles: ['admin'] },
            { id: 'master-obat', icon: <Pill size={20}/>, label: 'Obat', roles: ['admin'] },
            { id: 'transaksi', icon: <Stethoscope size={20}/>, label: 'Periksa', roles: ['admin'] },
            { id: 'screening', icon: <ClipboardCheck size={20}/>, label: 'Screening', roles: ['admin'] },
            { id: 'laporan', icon: <FileText size={20}/>, label: 'Rekap Kunjungan', roles: ['admin'] },
            { id: 'pengaturan', icon: <Settings size={20}/>, label: 'Setting', roles: ['admin', 'viewer'] },
          ].filter(item => item.roles.includes(userRole || 'viewer')).map((item, idx) => (
            <button key={`${item.id}-${idx}`} onClick={() => { setActivePage(item.id as any); if (window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition ${activePage === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
              {item.icon}<span className="text-sm font-bold lg:block">{item.label}</span>
            </button>
          ))}
        </nav>
        {user && (
          <div className="p-6 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition"><LogOut size={20}/><span className="font-bold lg:block">Logout</span></button>
          </div>
        )}
      </aside>

      <main className={`flex-1 transition-all duration-300 lg:ml-72 print:m-0 print:ml-0`}>
        <header className="h-24 bg-white/80 backdrop-blur-sm border-b border-slate-100 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-30 print:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 bg-slate-100 rounded-xl lg:hidden"><Menu size={20}/></button>
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-3 rounded-2xl border w-full max-w-xs lg:max-w-md"><Search size={18} className="text-slate-400"/><input type="text" placeholder={`Cari data...`} className="bg-transparent border-none outline-none text-sm w-full font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-600">
            {user ? user.email?.charAt(0).toUpperCase() : 'G'}
          </div>
        </header>
        <div className="p-6 lg:p-12 max-w-7xl mx-auto print:p-0">
          {renderContent()}
        </div>
      </main>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
        }
        .animate-in { animation: anim 0.5s ease-out; } @keyframes anim { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;
