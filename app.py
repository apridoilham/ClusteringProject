import base64
import io
from datetime import datetime
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pytz
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import pdist, squareform
import html

matplotlib.use('Agg')

app = Flask(__name__)

def clean_html_table(html_string):
    soup = BeautifulSoup(html_string, 'html.parser')
    for table in soup.find_all('table'):
        table['class'] = 'data-table'
        if table.has_attr('border'):
            del table['border']
        for cell in table.find_all(['td', 'th']):
            cell_text = cell.get_text(strip=True)
            cell.string = html.unescape(cell_text) 
    return str(soup)

def create_dendrogram(df):
    data = df.to_numpy()
    if data.shape[0] < 2:
        return None, None

    BG_COLOR = '#161B22'
    TEXT_COLOR = '#E6EDF3'
    BORDER_COLOR = '#30363D'
    ACCENT_COLOR = '#58A6FF'

    linkage_matrix = linkage(pdist(data, metric='euclidean'), method='single')
    dist_matrix_square = squareform(pdist(data, metric='euclidean'))

    with plt.rc_context({
        'lines.linewidth': 1.8,
        'text.color': TEXT_COLOR,
        'axes.labelcolor': TEXT_COLOR,
        'axes.edgecolor': BORDER_COLOR,
        'xtick.color': TEXT_COLOR,
        'ytick.color': TEXT_COLOR,
        'grid.color': BORDER_COLOR,
        'font.size': 10
    }):
        fig, ax = plt.subplots(figsize=(12, 7))
        fig.set_facecolor(BG_COLOR)
        ax.set_facecolor(BG_COLOR)

        dendro_plot = dendrogram(
            linkage_matrix,
            ax=ax,
            labels=df.index.tolist(),
            orientation='top', 
            leaf_rotation=45,
            leaf_font_size=10,
            color_threshold=0,
            above_threshold_color=ACCENT_COLOR
        )
        
        ax.set_title('Dendrogram Klastering Hierarki', fontsize=18, weight='bold', color=TEXT_COLOR, pad=20)
        ax.set_ylabel('Jarak Euclidean (Single Linkage)', fontsize=14, color=TEXT_COLOR, labelpad=15)

        for i, d in enumerate(dendro_plot['color_list']):
            if d != ACCENT_COLOR:
                dendro_plot['dcoord'][i][0].set_color(ACCENT_COLOR)
                dendro_plot['dcoord'][i][1].set_color(ACCENT_COLOR)
                dendro_plot['icoord'][i][0].set_color(ACCENT_COLOR)
                dendro_plot['icoord'][i][1].set_color(ACCENT_COLOR)
        
        ax.tick_params(axis='x', which='both', bottom=True, top=False, labelbottom=True, labelsize=10, pad=10)
        ax.tick_params(axis='y', which='both', left=True, right=False, labelleft=True, labelsize=10)

        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color(BORDER_COLOR)
        ax.spines['bottom'].set_color(BORDER_COLOR)

        ax.grid(axis='y', linestyle='--', alpha=0.2, color=BORDER_COLOR)
        
        plt.tight_layout()
        
    buf = io.BytesIO()
    fig.savefig(
        buf,
        format='png',
        facecolor=fig.get_facecolor(),
        dpi=180,
        bbox_inches='tight',
        pad_inches=0.2
    )
    plt.close(fig)
    buf.seek(0)
    
    plot_url = base64.b64encode(buf.getvalue()).decode('utf-8')
    dist_matrix_df = pd.DataFrame(dist_matrix_square, index=df.index, columns=df.index)
    
    return plot_url, dist_matrix_df

def center_data(df):
    return df.apply(lambda col: col - col.mean())

def scale_data(df, minnew, maxnew):
    return df.apply(lambda col: (col - col.min()) / (col.max() - col.min()) * (maxnew - minnew) + minnew if (col.max() - col.min()) != 0 else minnew)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/history-detail")
def history_detail_page():
    return render_template("history_detail.html")

@app.route("/calculate", methods=["POST"])
def calculate():
    try:
        data = request.get_json()
        analysis_type = data.get('analysis_type')
        columns_raw = data.get('columns', [])
        values_list_raw = data.get('values', [])

        data_dict = {}
        num_points = -1

        processed_pairs = []
        for i in range(len(columns_raw)):
            col_name = columns_raw[i].strip()
            val_string = values_list_raw[i].strip() if i < len(values_list_raw) else ''
            
            if col_name and val_string:
                processed_pairs.append((col_name, val_string))
        
        if not processed_pairs:
            return jsonify({'error': 'Tidak ada data valid yang dimasukkan. Mohon lengkapi setidaknya satu baris variabel.'}), 400

        for col_name, val_string in processed_pairs:
            if not col_name:
                return jsonify({'error': 'Nama variabel tidak boleh kosong untuk setiap baris data yang diisi.'}), 400
            
            try:
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
        df.index = [f'Poin {i+1}' for i in range(len(df))]

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
            result_df = df.copy()

        jakarta_tz = pytz.timezone('Asia/Jakarta')
        response_data = {
            'analysis_type': analysis_type,
            'input_data_html': clean_html_table(df.to_html(classes="data", float_format="%.4f")),
            'result_data_html': clean_html_table(result_df.to_html(classes="data", float_format="%.4f")),
            'plot_url': plot_url,
            'dist_matrix_html': clean_html_table(dist_matrix_df.to_html(classes="data", float_format="%.4f")) if dist_matrix_df is not None else None,
            'created_at': datetime.now(jakarta_tz).isoformat(),
        }
        return jsonify(response_data)
    except Exception as e:
        app.logger.error(f"Error pada /calculate: {e}")
        return jsonify({'error': f'Terjadi kesalahan internal di server: {str(e)}. Mohon coba lagi atau periksa format input Anda.'}), 500

if __name__ == "__main__":
    app.run(debug=True)