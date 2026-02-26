
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
  Eye
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
const Dashboard: React.FC<{ db: AppDatabase, setActivePage: (p: PageId) => void }> = ({ db, setActivePage }) => {
  const lowStock = db.obat.filter(o => o.stok < 3);
  const last10Days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (9 - i));
    return d.toISOString().split('T')[0];
  });
  const chartData = last10Days.map(day => ({
    name: day.split('-').slice(2).join('/'),
    kunjungan: db.transaksi.filter(t => t.tanggal.startsWith(day)).length,
    screening: db.screening.filter(s => s.tanggal === day).length
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Halo, Admin UKS 👋</h2>
          <p className="text-slate-500 mt-1">Berikut adalah ringkasan kesehatan siswa hari ini.</p>
        </div>
        <button onClick={() => setActivePage('transaksi')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95">
          <Plus size={20}/> Periksa Siswa
        </button>
      </header>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        <StatCard title="Total Kunjungan" value={db.transaksi.length} icon={<Users size={20}/>} color="bg-blue-500" trend="+12%" />
        <StatCard title="Siswa Berobat" value={db.transaksi.filter(t => t.penanganan === 'Minum Obat').length} icon={<Pill size={20}/>} color="bg-emerald-500" />
        <StatCard title="Screening" value={db.screening.length} icon={<ClipboardCheck size={20}/>} color="bg-purple-500" />
        <StatCard title="Stok Menipis" value={lowStock.length} icon={<AlertTriangle size={20}/>} color="bg-amber-500" />
        <StatCard title="Rujukan PKM" value={db.transaksi.filter(t => t.penanganan === 'Rujuk ke Puskesmas').length} icon={<Stethoscope size={20}/>} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-7 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-800"><TrendingUp size={20} className="text-blue-600"/> Tren Kunjungan Harian</h3>
          <div className="h-72">
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
        <div className="bg-white p-7 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800"><AlertTriangle size={20} className="text-amber-500"/> Notifikasi Sistem</h3>
          <div className="space-y-4">
            {lowStock.map(o => (
              <div key={o.id} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <div className="p-2 bg-amber-200 text-amber-700 rounded-lg h-fit"><Pill size={16}/></div>
                <div><p className="text-xs font-black text-amber-800 uppercase">Stok Kritis</p><p className="text-sm text-amber-700 mt-1"><strong>{o.nama}</strong> sisa {o.stok} unit.</p></div>
              </div>
            ))}
            {lowStock.length === 0 && <div className="py-20 text-center text-slate-400 italic">Semua obat dalam kondisi aman.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Master Siswa Component ---
const MasterSiswa: React.FC<{ db: AppDatabase, saveToStorage: (db: AppDatabase) => void, searchTerm: string }> = ({ db, saveToStorage, searchTerm }) => {
  const filteredSiswa = db.siswa.filter(s => s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || s.kelas.toLowerCase().includes(searchTerm.toLowerCase()));
  const addSiswa = async () => {
    const { value: v } = await Swal.fire({ title: 'Tambah Siswa', html: '<input id="i1" class="swal2-input" placeholder="Nama"><input id="i2" class="swal2-input" placeholder="Kelas">', preConfirm: () => [(document.getElementById('i1') as HTMLInputElement).value, (document.getElementById('i2') as HTMLInputElement).value], customClass:{popup:'rounded-3xl'} });
    if (v && v[0] && v[1]) saveToStorage({ ...db, siswa: [...db.siswa, { id: Date.now(), nama: v[0], kelas: v[1] }] });
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Data Peserta Didik</h2>
        <button onClick={addSiswa} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md transition hover:bg-blue-700"><Plus size={18}/> Tambah</button>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">ID</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Nama</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Kelas</th><th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase">Aksi</th></tr></thead>
            <tbody className="divide-y divide-gray-50">{filteredSiswa.map((s, i) => (<tr key={s.id} className="hover:bg-slate-50"><td className="px-6 py-4 font-mono text-xs">{i+1}</td><td className="px-6 py-4 font-bold text-slate-700">{s.nama}</td><td className="px-6 py-4"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black">{s.kelas}</span></td><td className="px-6 py-4 text-right"><button onClick={() => saveToStorage({...db, siswa: db.siswa.filter(x => x.id !== s.id)})} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 size={18}/></button></td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Master Obat Component ---
const MasterObat: React.FC<{ db: AppDatabase, saveToStorage: (db: AppDatabase) => void, searchTerm: string }> = ({ db, saveToStorage, searchTerm }) => {
  const filteredObat = db.obat.filter(o => o.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  const addObat = async () => {
    const { value: v } = await Swal.fire({ title: 'Tambah Obat', html: '<input id="i1" class="swal2-input" placeholder="Nama"><input id="i2" type="number" class="swal2-input" placeholder="Stok">', preConfirm: () => [(document.getElementById('i1') as HTMLInputElement).value, (document.getElementById('i2') as HTMLInputElement).value] });
    if (v && v[0]) saveToStorage({ ...db, obat: [...db.obat, { id: Date.now(), nama: v[0], stok: parseInt(v[1] || '0') }] });
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Persediaan Obat</h2>
        <button onClick={addObat} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md transition hover:bg-blue-700"><Plus size={18}/> Tambah</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredObat.map(o => (
          <div key={o.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group transition hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${o.stok < 3 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}><Pill size={24}/></div>
              <button onClick={() => saveToStorage({...db, obat: db.obat.filter(x => x.id !== o.id)})} className="text-rose-400 p-2"><Trash2 size={18}/></button>
            </div>
            <div className="mt-4"><h4 className="font-black text-slate-800 text-lg">{o.nama}</h4><div className="flex items-center justify-between mt-2"><span className="text-2xl font-black text-slate-800">{o.stok}</span><span className={`text-[10px] px-3 py-1 rounded-full font-black ${o.stok < 3 ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>{o.stok < 3 ? 'KRITIS' : 'STABIL'}</span></div></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Form Transaksi Component ---
const FormTransaksi: React.FC<{ db: AppDatabase, saveToStorage: (db: AppDatabase) => void, onPreview: (d: Transaction) => void }> = ({ db, saveToStorage, onPreview }) => {
  const [f, setF] = useState({ tgl: new Date().toISOString().slice(0, 16), kls: '', sid: '', kel: 'Pusing', kl: '', pen: 'Istirahat' });
  const [ou, setOu] = useState<{id: string | number, qty: number}[]>([]);
  const classes = [...new Set(db.siswa.map(s => s.kelas))].sort();

  const handleProcess = (isPreview: boolean = false) => {
    const s = db.siswa.find(x => x.id.toString() === f.sid);
    if (!s) return Swal.fire('Pilih Siswa!', '', 'warning');
    const newObat = [...db.obat];
    const det = ou.map(item => {
      const m = db.obat.find(o => o.id.toString() === item.id.toString());
      if (m) {
        const idx = newObat.findIndex(x => x.id === m.id);
        newObat[idx].stok -= item.qty;
        return `${m.nama} (${item.qty})`;
      }
      return '';
    }).filter(Boolean).join(', ');

    const tx: Transaction = { id: Date.now(), tanggal: f.tgl, namaSiswa: s.nama, kelas: f.kls, keluhan: f.kel === 'Lainya' ? f.kl : f.kel, penanganan: f.pen, obatDetail: det };
    
    if (isPreview) {
      onPreview(tx);
    } else {
      saveToStorage({ ...db, transaksi: [tx, ...db.transaksi], obat: newObat });
      Swal.fire('Tersimpan', '', 'success');
      resetForm();
    }
  };

  const resetForm = () => {
    setF({ ...f, sid: '', kl: '', pen: 'Istirahat' });
    setOu([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pemeriksaan UKS</h2>
      <div className="bg-white p-8 sm:p-10 rounded-[40px] shadow-xl border border-blue-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users size={16}/> Identitas</h4>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500">Waktu</label><input type="datetime-local" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={f.tgl} onChange={e => setF({...f, tgl: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500">Kelas</label><select className="w-full p-4 bg-slate-50 rounded-2xl" value={f.kls} onChange={e => setF({...f, kls: e.target.value, sid: ''})}><option value="">Pilih</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-500">Siswa</label><select className="w-full p-4 bg-slate-50 rounded-2xl" value={f.sid} onChange={e => setF({...f, sid: e.target.value})}><option value="">Pilih</option>{db.siswa.filter(x => x.kelas === f.kls).map(x => <option key={x.id} value={x.id}>{x.nama}</option>)}</select></div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Stethoscope size={16}/> Diagnosa</h4>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500">Keluhan</label><select className="w-full p-4 bg-slate-50 rounded-2xl" value={f.kel} onChange={e => setF({...f, kel: e.target.value})}><option value="Pusing">Pusing</option><option value="Mual">Mual</option><option value="Demam">Demam</option><option value="Lainya">Lainya</option></select></div>
              <div><label className="text-xs font-bold text-slate-500">Penanganan</label><select className="w-full p-4 bg-slate-50 rounded-2xl" value={f.pen} onChange={e => setF({...f, pen: e.target.value})}><option value="Istirahat">Istirahat</option><option value="Minum Obat">Minum Obat</option><option value="Pulang">Pulang (Surat Izin)</option></select></div>
            </div>
          </div>
          <div className="md:col-span-2 bg-blue-600 p-8 rounded-[32px] shadow-2xl">
            <div className="flex justify-between items-center text-white mb-6 font-black"><h4><Pill size={24}/> Penggunaan Obat</h4><button type="button" onClick={() => setOu([...ou, {id:'', qty:1}])} className="bg-white/20 px-4 py-2 rounded-xl text-xs">+ OBAT</button></div>
            {ou.map((row, i) => (<div key={i} className="flex gap-3 mb-2"><select className="flex-1 p-3 rounded-xl" value={row.id} onChange={e => { const n = [...ou]; n[i].id = e.target.value; setOu(n); }}><option value="">Pilih Obat</option>{db.obat.map(o => <option key={o.id} value={o.id}>{o.nama}</option>)}</select><input type="number" className="w-20 p-3 rounded-xl text-center" value={row.qty} onChange={e => { const n = [...ou]; n[i].qty = parseInt(e.target.value || '1'); setOu(n); }} /><button type="button" onClick={() => setOu(ou.filter((_, idx) => idx !== i))} className="bg-rose-500 text-white p-3 rounded-xl"><Trash2 size={18}/></button></div>))}
          </div>
          <div className="md:col-span-2 flex justify-end gap-4">
            {f.pen === 'Pulang' && <button type="button" onClick={() => handleProcess(true)} className="bg-slate-800 text-white px-8 py-4 rounded-3xl font-black shadow-lg hover:bg-slate-900 transition flex items-center gap-2"><Printer size={20}/> PREVIEW IZIN</button>}
            <button type="button" onClick={() => handleProcess(false)} className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black shadow-lg hover:bg-blue-700 transition">SIMPAN REKAM MEDIS</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Laporan & Arsip Component ---
const Laporan: React.FC<{ db: AppDatabase, saveToStorage: (db: AppDatabase) => void, searchTerm: string, onPreview: (d: Transaction) => void }> = ({ db, saveToStorage, searchTerm, onPreview }) => {
  const filteredTx = db.transaksi.filter(tx => tx.namaSiswa.toLowerCase().includes(searchTerm.toLowerCase()) || tx.keluhan.toLowerCase().includes(searchTerm.toLowerCase()) || tx.penanganan.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleEdit = async (tx: Transaction) => {
    const { value: v } = await Swal.fire({
      title: 'Edit Rekam Medis',
      html: `<input id="sw1" type="datetime-local" class="swal2-input" value="${tx.tanggal}"><input id="sw2" class="swal2-input" placeholder="Keluhan" value="${tx.keluhan}"><input id="sw3" class="swal2-input" placeholder="Penanganan" value="${tx.penanganan}"><input id="sw4" class="swal2-input" placeholder="Obat" value="${tx.obatDetail}">`,
      preConfirm: () => [(document.getElementById('sw1') as HTMLInputElement).value, (document.getElementById('sw2') as HTMLInputElement).value, (document.getElementById('sw3') as HTMLInputElement).value, (document.getElementById('sw4') as HTMLInputElement).value]
    });
    if (v) {
      const updated = db.transaksi.map(t => t.id === tx.id ? {...t, tanggal: v[0], keluhan: v[1], penanganan: v[2], obatDetail: v[3]} : t);
      saveToStorage({...db, transaksi: updated});
      Swal.fire('Terupdate', '', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Laporan & Arsip</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group transition hover:border-blue-200">
          <h4 className="font-black text-slate-800 mb-1">Kunjungan UKS</h4>
          <button onClick={() => {
            const ws = XLSX.utils.json_to_sheet(db.transaksi);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Kunjungan");
            XLSX.writeFile(wb, "Kunjungan_UKS.xlsx");
          }} className="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl flex justify-center items-center gap-2 font-black shadow-md"><Download size={18}/> EKSPOR XLSX</button>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group transition hover:border-emerald-200">
          <h4 className="font-black text-slate-800 mb-1">Stok Obat</h4>
          <button onClick={() => {
            const ws = XLSX.utils.json_to_sheet(db.obat);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stok_Obat");
            XLSX.writeFile(wb, "Stok_Obat.xlsx");
          }} className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-2xl flex justify-center items-center gap-2 font-black shadow-md"><Download size={18}/> EKSPOR XLSX</button>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group transition hover:border-purple-200">
          <h4 className="font-black text-slate-800 mb-1">Hasil Screening</h4>
          <button onClick={() => {
            const ws = XLSX.utils.json_to_sheet(db.screening);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Screening");
            XLSX.writeFile(wb, "Screening_Siswa.xlsx");
          }} className="w-full mt-4 bg-purple-600 text-white py-3 rounded-2xl flex justify-center items-center gap-2 font-black shadow-md"><Download size={18}/> EKSPOR XLSX</button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-slate-50 p-6 border-b flex justify-between items-center font-black text-slate-800">ARSIP 50 KEJADIAN TERAKHIR</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/50"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-6 py-4 text-left">Waktu</th><th className="px-6 py-4 text-left">Nama Siswa</th><th className="px-6 py-4 text-left">Kelas</th><th className="px-6 py-4 text-left">Keluhan</th><th className="px-6 py-4 text-right print:hidden">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-50">{filteredTx.slice(0, 50).map(tx => (
              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{tx.tanggal.replace('T', ' ')}</td>
                <td className="px-6 py-4 font-black text-slate-700">{tx.namaSiswa}</td>
                <td className="px-6 py-4 font-bold text-slate-500">{tx.kelas}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black text-slate-600">{tx.keluhan.toUpperCase()}</span></td>
                <td className="px-6 py-4 text-right print:hidden flex justify-end gap-1">
                  {tx.penanganan.includes('Pulang') && (
                    <button onClick={() => onPreview(tx)} className="text-slate-400 hover:text-slate-800 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition" title="Print Preview">
                      <FileBadge size={16}/>
                    </button>
                  )}
                  <button onClick={() => handleEdit(tx)} className="text-blue-400 hover:text-blue-600 p-2"><Edit size={16}/></button>
                  <button onClick={() => saveToStorage({...db, transaksi: db.transaksi.filter(x => x.id !== tx.id)})} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 size={16}/></button>
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
const ScreeningPage: React.FC<{ db: AppDatabase, saveToStorage: (db: AppDatabase) => void }> = ({ db, saveToStorage }) => {
  const [scForm, setScForm] = useState({ tanggal: new Date().toISOString().split('T')[0], kelas: '', siswaId: '', hasil: 'Sehat' as any, keluhan: '', dokter: '' });
  const uniqueClasses = [...new Set(db.siswa.map(s => s.kelas))].sort();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const s = db.siswa.find(x => x.id.toString() === scForm.siswaId);
    if (!s) return;
    const entry: Screening = { id: Date.now(), tanggal: scForm.tanggal, studentId: s.id, namaSiswa: s.nama, kelas: s.kelas, hasil: scForm.hasil, keluhan: scForm.keluhan, dokter: scForm.dokter };
    saveToStorage({ ...db, screening: [entry, ...db.screening] });
    Swal.fire('Berhasil', 'Data screening disimpan', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Screening Kesehatan</h2>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-purple-50">
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-purple-600 uppercase">Informasi</h4>
            <input type="date" className="w-full p-3 bg-slate-50 rounded-xl" value={scForm.tanggal} onChange={e => setScForm({...scForm, tanggal: e.target.value})} />
            <select className="w-full p-3 bg-slate-50 rounded-xl" value={scForm.kelas} onChange={e => setScForm({...scForm, kelas: e.target.value, siswaId: ''})}><option value="">Pilih Kelas</option>{uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select className="w-full p-3 bg-slate-50 rounded-xl" value={scForm.siswaId} onChange={e => setScForm({...scForm, siswaId: e.target.value})}><option value="">Pilih Siswa</option>{db.siswa.filter(x => x.kelas === scForm.kelas).map(x => <option key={x.id} value={x.id}>{x.nama}</option>)}</select>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-black text-purple-600 uppercase">Evaluasi</h4>
            <select className="w-full p-3 bg-slate-50 rounded-xl" value={scForm.hasil} onChange={e => setScForm({...scForm, hasil: e.target.value as any})}><option value="Sehat">Sehat</option><option value="Perlu Pemantauan">Perlu Pemantauan</option><option value="Perlu Rujukan">Perlu Rujukan</option></select>
            <input type="text" className="w-full p-3 bg-slate-50 rounded-xl" placeholder="Catatan/Keluhan" value={scForm.keluhan} onChange={e => setScForm({...scForm, keluhan: e.target.value})} />
            <input type="text" className="w-full p-3 bg-slate-50 rounded-xl" placeholder="Petugas Pemeriksa" value={scForm.dokter} onChange={e => setScForm({...scForm, dokter: e.target.value})} />
            <button type="submit" className="w-full bg-purple-600 text-white p-4 rounded-xl font-bold shadow-md hover:bg-purple-700 transition">Simpan Screening</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Pengaturan Component ---
const Pengaturan: React.FC<{ db: AppDatabase, setDb: (db: AppDatabase) => void, saveToStorage: (db: AppDatabase) => void }> = ({ db, setDb, saveToStorage }) => {
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

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.user && json.siswa) {
          saveToStorage(json);
          Swal.fire('Restorasi Berhasil', 'Database UKS telah diperbarui dari file cadangan.', 'success');
        } else {
          throw new Error('Format database tidak valid');
        }
      } catch (err) {
        Swal.fire('Kesalahan', 'File cadangan tidak valid atau rusak.', 'error');
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
    }).then((r) => { 
      if (r.isConfirmed) {
        saveToStorage(DEFAULT_DB);
        Swal.fire('Direset', 'Database kembali ke pengaturan awal.', 'success');
      }
    }); 
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Settings size={20}/> Kredensial Admin</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Username</label>
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={db.user.username} onChange={e => setDb({...db, user: {...db.user, username: e.target.value}})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Password Baru</label>
              <input type="password" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={db.user.password} onChange={e => setDb({...db, user: {...db.user, password: e.target.value}})} />
            </div>
            <button onClick={() => { saveToStorage(db); Swal.fire('Tersimpan', 'Profil admin telah diperbarui.', 'success'); }} className="bg-blue-600 text-white py-4 rounded-2xl font-black w-full shadow-md hover:bg-blue-700 transition">Update Profil</button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Download size={20} className="text-emerald-500"/> Pemeliharaan Data</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">Cadangkan data secara rutin ke dalam file .json untuk mencegah kehilangan data jika cache browser dibersihkan.</p>
          <div className="space-y-4 mt-auto">
            <button onClick={handleBackup} className="w-full bg-emerald-600 text-white py-4 rounded-2xl flex justify-center items-center gap-3 font-black hover:bg-emerald-700 transition shadow-md">
              <Download size={20}/> Download Backup (.json)
            </button>
            <label className="w-full bg-slate-800 text-white py-4 rounded-2xl flex justify-center items-center gap-3 font-black cursor-pointer hover:bg-slate-900 transition shadow-md">
              <Upload size={20}/> Restore dari Backup
              <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
            </label>
          </div>
        </div>

        <div className="md:col-span-2 bg-rose-50 p-8 rounded-[32px] border border-rose-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h3 className="font-black text-rose-800 mb-2 flex items-center gap-2"><AlertTriangle size={20}/> Bahaya: Reset Database</h3>
            <p className="text-xs text-rose-700 opacity-70 font-bold">Tindakan ini akan menghapus semua catatan medis, stok obat, dan data siswa secara permanen!</p>
          </div>
          <button onClick={handleReset} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black shadow-md hover:bg-rose-700 transition whitespace-nowrap">
            Reset Factory Data
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [db, setDb] = useState<AppDatabase>(DEFAULT_DB);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewData, setPreviewData] = useState<Transaction | null>(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  useEffect(() => {
    const saved = localStorage.getItem('uks_db');
    if (saved) setDb(JSON.parse(saved));
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveToStorage = useCallback((newDb: AppDatabase) => { setDb(newDb); localStorage.setItem('uks_db', JSON.stringify(newDb)); }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === db.user.username && loginForm.password === db.user.password) {
      setIsLoggedIn(true);
      Swal.fire({ icon: 'success', title: 'Selamat Datang!', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } });
    } else {
      Swal.fire({ icon: 'error', title: 'Login Gagal', text: 'Kredensial salah!' });
    }
  };

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

  if (!isLoggedIn) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-14 rounded-[50px] shadow-2xl w-full max-w-lg border border-slate-100">
        <div className="text-center mb-12">
          <div className="inline-block p-6 bg-blue-600 rounded-[35px] mb-6 shadow-xl shadow-blue-200"><Stethoscope size={56} className="text-white"/></div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">UKS SMPN 7</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <input type="text" className="w-full p-5 bg-slate-50 rounded-3xl outline-none font-bold" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required />
          <input type="password" className="w-full p-5 bg-slate-50 rounded-3xl outline-none font-bold" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
          <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-[30px] shadow-xl hover:bg-blue-700 transition active:scale-95">Masuk Sistem</button>
        </form>
      </div>
    </div>
  );

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
            { id: 'dashboard', icon: <LayoutDashboard size={20}/>, label: 'Dashboard' },
            { id: 'master-siswa', icon: <Users size={20}/>, label: 'Siswa' },
            { id: 'master-obat', icon: <Pill size={20}/>, label: 'Obat' },
            { id: 'transaksi', icon: <Stethoscope size={20}/>, label: 'Periksa' },
            { id: 'screening', icon: <ClipboardCheck size={20}/>, label: 'Screening' },
            { id: 'laporan', icon: <FileText size={20}/>, label: 'Laporan' },
            { id: 'pengaturan', icon: <Settings size={20}/>, label: 'Setting' },
          ].map(i => (
            <button key={i.id} onClick={() => { setActivePage(i.id as any); if (window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition ${activePage === i.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
              {i.icon}<span className="text-sm font-bold lg:block">{i.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800"><button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition"><LogOut size={20}/><span className="font-bold lg:block">Logout</span></button></div>
      </aside>

      <main className={`flex-1 transition-all duration-300 lg:ml-72 print:m-0 print:ml-0`}>
        <header className="h-24 bg-white/80 backdrop-blur-sm border-b border-slate-100 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-30 print:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 bg-slate-100 rounded-xl lg:hidden"><Menu size={20}/></button>
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-3 rounded-2xl border w-full max-w-xs lg:max-w-md"><Search size={18} className="text-slate-400"/><input type="text" placeholder={`Cari data...`} className="bg-transparent border-none outline-none text-sm w-full font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black">{db.user.username.charAt(0).toUpperCase()}</div>
        </header>
        <div className="p-6 lg:p-12 max-w-7xl mx-auto print:p-0">
          {activePage === 'dashboard' && <Dashboard db={db} setActivePage={setActivePage} />}
          {activePage === 'master-siswa' && <MasterSiswa db={db} saveToStorage={saveToStorage} searchTerm={searchTerm} />}
          {activePage === 'master-obat' && <MasterObat db={db} saveToStorage={saveToStorage} searchTerm={searchTerm} />}
          {activePage === 'transaksi' && <FormTransaksi db={db} saveToStorage={saveToStorage} onPreview={setPreviewData} />}
          {activePage === 'screening' && <ScreeningPage db={db} saveToStorage={saveToStorage} />}
          {activePage === 'laporan' && <Laporan db={db} saveToStorage={saveToStorage} searchTerm={searchTerm} onPreview={setPreviewData} />}
          {activePage === 'pengaturan' && <Pengaturan db={db} setDb={setDb} saveToStorage={saveToStorage} />}
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
