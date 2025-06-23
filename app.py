import base64
import io
from datetime import datetime
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pytz
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request, flash, redirect, url_for, session
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import pdist, squareform
import html

matplotlib.use('Agg')

app = Flask(__name__)
app.secret_key = 'your_super_secret_key_here' # Ganti dengan kunci rahasia yang kuat dan unik!

# Fungsi formatter kustom untuk format angka dinamis di tabel HTML
def dynamic_float_formatter(x):
    """
    Memformat angka:
    - Bilangan bulat (termasuk X.0) akan ditampilkan sebagai integer.
    - Bilangan desimal dengan <= 3 angka di belakang koma akan ditampilkan apa adanya.
    - Bilangan desimal dengan > 3 angka di belakang koma akan dibulatkan menjadi 3 desimal.
    - NaN atau non-angka akan dikembalikan sebagai string kosong/aslinya.
    """
    if pd.isna(x): # Tangani nilai Not-a-Number (NaN)
        return ''
    
    try:
        val = float(x)
    except (ValueError, TypeError): # Jika input bukan angka (misal string), kembalikan string aslinya
        return str(x)

    # Jika angka bulat (misal 5.0 atau 5)
    if val == int(val):
        return f"{int(val):.0f}" # Tampilkan sebagai integer tanpa desimal
    
    # Periksa bagian desimal untuk menentukan pemformatan
    s = str(val) # Konversi ke string untuk memeriksa jumlah desimal sebenarnya
    if '.' in s:
        decimal_part = s.split('.')[-1]
        # Jika jumlah digit di bagian desimal kurang dari atau sama dengan 3,
        # dan representasi string tidak memiliki '0' berlebihan (contoh: 0.200 -> 0.2)
        if len(decimal_part) <= 3 and s == f"{val:.{len(decimal_part)}f}":
            return s # Tampilkan persis seperti itu (contoh: 0.2, 1.5, 7.25, 0.123)
    
    # Jika desimalnya > 3 angka atau ada '0' berlebihan, bulatkan ke 3 angka di belakang koma
    return f"{val:.3f}"

# Fungsi untuk membersihkan dan memodifikasi tabel HTML yang dihasilkan Pandas
def clean_html_table(html_string):
    """
    Memodifikasi tabel HTML yang dihasilkan Pandas:
    - Menambahkan kelas CSS Tailwind ke tabel.
    - Mengganti heading kolom indeks pertama ("0", "1", dst.) menjadi "No".
    """
    soup = BeautifulSoup(html_string, 'html.parser')
    for table in soup.find_all('table'):
        table['class'] = 'data-table w-full' # Tambahkan kelas Tailwind
        if table.has_attr('border'): # Hapus atribut border HTML lama
            del table['border']
        
        # Modifikasi heading tabel
        if table.find('thead'):
            header_row = table.find('thead').find('tr')
            if header_row:
                # Temukan TH pertama (yang dibuat Pandas untuk indeks DataFrame)
                first_th = header_row.find('th')
                if first_th:
                    # Ganti teks TH pertama menjadi "No"
                    first_th.string = "No"
        
        # Isi TD pertama di setiap baris tidak perlu dimodifikasi
        # karena df.to_html(index=True) sudah mengisinya dengan 1, 2, 3...
        # yang sudah kita atur sebelumnya di df.index.
    return str(soup)

def center_data(df):
    """Melakukan centering data dengan mengurangi rata-rata setiap kolom."""
    return df.apply(lambda col: col - col.mean())

def scale_data(df, minnew, maxnew):
    """
    Melakukan normalisasi Min-Max Scaling pada data.
    Data akan disesuaikan ke rentang [minnew, maxnew].
    """
    return df.apply(lambda col: (col - col.min()) / (col.max() - col.min()) * (maxnew - minnew) + minnew if (col.max() - col.min()) != 0 else minnew)

def create_dendrogram(df):
    """
    Membuat dendrogram klastering hirarkis dari DataFrame.
    Mengembalikan URL gambar Base64 dan DataFrame matriks jarak.
    """
    data = df.to_numpy()
    # Pastikan ada cukup data (minimal 2 poin) dan bentuknya valid untuk dendrogram
    if data.shape[0] < 2 or data.size == 0:
        app.logger.error("Error: Dendrogram requires at least 2 data points with valid values.")
        return None, None # Mengembalikan 2 None karena signature fungsi ini

    BG_COLOR = '#161B22'
    TEXT_COLOR = '#E6EDF3'
    BORDER_COLOR = '#30363D'
    ACCENT_COLOR = '#58A6FF'

    # Pastikan linkage_matrix dan dist_matrix_square Didefinisikan SEBELUM digunakan
    try:
        linkage_matrix = linkage(pdist(data, metric='euclidean'), method='single')
        dist_matrix_square = squareform(pdist(data, metric='euclidean'))
    except Exception as e:
        app.logger.error(f"Error creating linkage matrix or distance matrix: {e}")
        return None, None # Mengembalikan 2 None jika terjadi kesalahan

    with plt.rc_context({
        'lines.linewidth': 1.8,
        'text.color': TEXT_COLOR,
        'axes.labelcolor': TEXT_COLOR,
        'axes.edgecolor': BORDER_COLOR,
        'xtick.color': TEXT_COLOR,
        'ytick.color': TEXT_COLOR,
        'grid.color': BORDER_COLOR,
        'font.size': 30 # Ukuran font umum untuk ticks (90 / 3 = 30)
    }):
        # Ukuran figure disesuaikan kembali agar sesuai dengan ukuran font yang lebih kecil
        fig, ax = plt.subplots(figsize=(20, 12)) # Ukuran figure kembali ke sebelumnya
        fig.set_facecolor(BG_COLOR)
        ax.set_facecolor(BG_COLOR)

        dendro_plot = dendrogram(
            linkage_matrix,
            ax=ax,
            labels=df.index.tolist(), # Gunakan index DataFrame (1, 2, 3...)
            orientation='top',
            leaf_rotation=45,
            leaf_font_size=33, # Ukuran font label daun (100 / 3 = ~33)
            color_threshold=0, # Batas warna untuk klaster, 0 berarti semua garis warna dasar
            above_threshold_color=ACCENT_COLOR
        )

        ax.set_title('Dendrogram Klastering Hierarki', fontsize=43, weight='bold', color=TEXT_COLOR, pad=20) # Ukuran font judul (130 / 3 = ~43)
        ax.set_ylabel('Jarak Euclidean (Single Linkage)', fontsize=37, color=TEXT_COLOR, labelpad=15) # Ukuran font label Y (110 / 3 = ~37)

        # Pastikan semua garis dendrogram berwarna ACCENT_COLOR
        for line in ax.get_lines():
            line.set_color(ACCENT_COLOR)

        # Ukuran font untuk tick marks pada sumbu X dan Y
        ax.tick_params(axis='x', which='both', bottom=True, top=False, labelbottom=True, labelsize=30, pad=10) # 90 / 3 = 30
        ax.tick_params(axis='y', which='both', left=True, right=False, labelleft=True, labelsize=30) # 90 / 3 = 30

        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color(BORDER_COLOR)
        ax.spines['bottom'].set_color(BORDER_COLOR)

        ax.grid(axis='y', linestyle='--', alpha=0.2, color=BORDER_COLOR)

        plt.tight_layout() # Sesuaikan layout agar label tidak terpotong

    buf = io.BytesIO()
    fig.savefig(
        buf,
        format='png',
        facecolor=fig.get_facecolor(),
        dpi=180, # Resolusi gambar
        bbox_inches='tight', # Pastikan semua elemen masuk gambar
        pad_inches=0.2 # Padding di sekitar gambar
    )
    plt.close(fig) # Tutup figure untuk menghemat memori
    buf.seek(0) # Kembali ke awal buffer

    plot_url = base64.b64encode(buf.getvalue()).decode('utf-8')
    dist_matrix_df = pd.DataFrame(dist_matrix_square, index=df.index, columns=df.index)

    return plot_url, dist_matrix_df

# --- Route Aplikasi Flask ---

@app.route("/")
def index():
    """Menampilkan halaman utama aplikasi."""
    return render_template("index.html")

@app.route("/history-detail")
def history_detail_page():
    """Menampilkan halaman detail riwayat analisis."""
    return render_template("history_detail.html")

@app.route("/calculate", methods=["POST"])
def calculate():
    """
    Endpoint untuk melakukan perhitungan centering, scaling, atau euclidean.
    Menerima data JSON dari frontend dan mengembalikan hasil dalam format JSON.
    """
    try:
        data = request.get_json()
        analysis_type = data.get('analysis_type')
        columns_raw = data.get('columns', [])
        values_list_raw = data.get('values', [])

        data_dict = {}
        num_points = -1 # Untuk memeriksa konsistensi jumlah nilai

        processed_pairs = []
        for i in range(len(columns_raw)):
            col_name = columns_raw[i].strip()
            val_string = values_list_raw[i].strip() if i < len(values_list_raw) else ''

            if col_name or val_string: # Hanya proses pasangan yang memiliki nama kolom atau nilai
                processed_pairs.append((col_name, val_string))

        if not processed_pairs:
            return jsonify({'error': 'Tidak ada data valid yang dimasukkan. Mohon lengkapi setidaknya satu baris variabel.'}), 400

        for col_name, val_string in processed_pairs:
            if not col_name:
                return jsonify({'error': 'Nama variabel tidak boleh kosong untuk setiap baris data yang diisi.'}), 400

            try:
                # Parsing nilai sebagai float. Validasi lebih lanjut (integer) dilakukan di JS.
                values = [float(v.strip()) for v in val_string.replace(',', ' ').split() if v.strip()]
            except ValueError:
                return jsonify({'error': f'Nilai untuk variabel "{col_name}" harus berupa angka yang dipisahkan spasi atau koma.'}), 400

            if not values:
                return jsonify({'error': f'Nilai untuk variabel "{col_name}" tidak boleh kosong.'}), 400

            if num_points == -1:
                num_points = len(values)
            elif len(values) != num_points:
                return jsonify({'error': f'Jumlah nilai untuk variabel "{col_name}" ({len(values)}) tidak konsisten dengan variabel lain ({num_points}). Semua variabel harus memiliki jumlah nilai yang sama.'}), 400

            data_dict[col_name] = values

        if not data_dict:
            return jsonify({'error': 'Tidak ada data valid yang dapat diproses setelah validasi.'}), 400

        df = pd.DataFrame(data_dict)
        # Mengubah indeks DataFrame agar dimulai dari 1 (untuk tampilan "No" di tabel)
        df.index = [i + 1 for i in range(len(df))]

        plot_url, dist_matrix_df, result_df = None, None, df.copy()

        if analysis_type == 'centering':
            result_df = center_data(df)
        elif analysis_type == 'scaling':
            try:
                minnew = float(data.get('minnew', 0))
                maxnew = float(data.get('maxnew', 1))
                if minnew >= maxnew:
                    return jsonify({'error': 'Nilai minimum baru harus lebih kecil dari nilai maksimum baru untuk Scaling.'}), 400
            except ValueError:
                return jsonify({'error': 'Nilai minimum dan maksimum baru harus berupa angka untuk Scaling.'}), 400
            result_df = scale_data(df, minnew, maxnew)
        elif analysis_type == 'euclidean':
            if len(df) < 2:
                return jsonify({'error': 'Perhitungan Euclidean memerlukan minimal 2 data poin.'}), 400
            
            plot_url, dist_matrix_df = create_dendrogram(df)
            
            # Jika dendrogram berhasil dibuat, pastikan matriks jarak juga memiliki indeks yang benar
            if dist_matrix_df is not None:
                dist_matrix_df.index = df.index    # Sesuaikan indeks baris
                dist_matrix_df.columns = df.index # Sesuaikan indeks kolom

            result_df = df.copy() # Untuk euclidean, result_df adalah data input aslinya

        jakarta_tz = pytz.timezone('Asia/Jakarta')
        response_data = {
            'analysis_type': analysis_type,
            # Konversi DataFrame ke HTML, gunakan index=True untuk kolom "No"
            # dan dynamic_float_formatter untuk format angka
            'input_data_html': clean_html_table(df.to_html(classes="data", float_format=dynamic_float_formatter, index=True)),
            'result_data_html': clean_html_table(result_df.to_html(classes="data", float_format=dynamic_float_formatter, index=True)),
            'plot_url': plot_url,
            'dist_matrix_html': clean_html_table(dist_matrix_df.to_html(classes="data", float_format=dynamic_float_formatter, index=True)) if dist_matrix_df is not None else None,
            'created_at': datetime.now(jakarta_tz).isoformat(),
        }
        return jsonify(response_data)
    except Exception as e:
        app.logger.error(f"Error pada /calculate: {e}")
        return jsonify({'error': f'Terjadi kesalahan internal di server: {str(e)}. Mohon coba lagi atau periksa format input Anda.'}), 500

if __name__ == "__main__":
    app.run(debug=True)