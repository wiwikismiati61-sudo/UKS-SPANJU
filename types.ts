
export interface User {
  username: string;
  password: string;
}

export interface Student {
  id: string | number;
  nama: string;
  kelas: string;
}

export interface Medicine {
  id: string | number;
  nama: string;
  stok: number;
}

export interface Transaction {
  id: number;
  tanggal: string;
  namaSiswa: string;
  kelas: string;
  keluhan: string;
  penanganan: string;
  obatDetail: string;
}

export interface Screening {
  id: number;
  tanggal: string;
  studentId: string | number;
  namaSiswa: string;
  kelas: string;
  hasil: 'Sehat' | 'Perlu Pemantauan' | 'Perlu Rujukan';
  keluhan: string;
  dokter: string;
}

export interface AppDatabase {
  user: User;
  siswa: Student[];
  obat: Medicine[];
  transaksi: Transaction[];
  screening: Screening[];
}

export type PageId = 'dashboard' | 'master-siswa' | 'master-obat' | 'transaksi' | 'screening' | 'laporan' | 'pengaturan';
