# Analisis Clustering Lanjutan

Aplikasi ini adalah alat berbasis web yang dibangun dengan Flask untuk melakukan beberapa teknik pra-pemrosesan data dan analisis clustering, termasuk Centering, Scaling, dan visualisasi Dendrogram menggunakan jarak Euclidean.

## Fitur Unggulan

- **Input Data Dinamis**: Tambah atau hapus variabel dan data poin dengan mudah melalui antarmuka.
- **Tiga Jenis Analisis**:
    1.  **Centering**: Memusatkan data dengan mengurangi nilai rata-rata.
    2.  **Scaling**: Menormalkan data ke dalam rentang baru (Min-Max Scaling).
    3.  **Euclidean**: Menghitung matriks jarak Euclidean dan menghasilkan visualisasi Dendrogram yang jelas dan interaktif.
- **Riwayat Perhitungan**: Setiap perhitungan disimpan di `localStorage` browser, memungkinkan pengguna untuk melihat kembali hasil sebelumnya.
- **Pengalaman Pengguna (UX) Profesional**:
    - Dialog konfirmasi untuk tindakan penting.
    - Umpan balik validasi form yang jelas.
    - Tampilan "Empty State" yang informatif.
    - Dendrogram dapat diperbesar untuk analisis detail.
- **Desain Bersih dan Modern**: Antarmuka terang yang responsif menggunakan TailwindCSS.
- **Kode Terstruktur**: Kode JavaScript yang modular dan backend Python yang tangguh.

## Teknologi yang Digunakan

- **Backend**: Flask (Python)
- **Frontend**: HTML, TailwindCSS, JavaScript, GSAP
- **Library Python**: Pandas, NumPy, SciPy, Matplotlib

## Cara Menjalankan

1.  **Clone Repositori**
    ```bash
    git clone https://github.com/apridoilham/ClusteringProject.git
    cd nama-direktori-proyek
    ```

2.  **Buat dan Aktifkan Virtual Environment**
    ```bash
    python -m venv venv
    # Windows: .\venv\Scripts\activate
    # macOS/Linux: source venv/bin/activate
    ```

3.  **Instal Dependensi**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Jalankan Aplikasi Flask**
    ```bash
    flask run
    ```

5.  Buka browser Anda dan kunjungi `http://127.0.0.1:5000`# ClusteringProject
