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

matplotlib.use('Agg')

app = Flask(__name__)

def clean_html_table(html_string):
    soup = BeautifulSoup(html_string, 'html.parser')
    for table in soup.find_all('table'):
        table['class'] = 'data-table'
        if table.has_attr('border'):
            del table['border']
    return str(soup)

def create_dendrogram(df):
    data = df.to_numpy()
    if data.shape[0] < 2: return None, None
    linkage_matrix = linkage(pdist(data, metric='euclidean'), method='single')
    dist_matrix_square = squareform(pdist(data, metric='euclidean'))
    with plt.rc_context({
        'lines.linewidth': 1.5, 'text.color': 'black', 'axes.labelcolor': 'black',
        'axes.edgecolor': 'black', 'xtick.color': 'black', 'ytick.color': 'black',
    }):
        fig, ax = plt.subplots(figsize=(12, 8))
        fig.set_facecolor('white')
        ax.set_facecolor('white')
        dendrogram(
            linkage_matrix, ax=ax, labels=df.index, orientation='top',
            leaf_rotation=90., leaf_font_size=10., color_threshold=0, above_threshold_color='black'
        )
        ax.set_title('Dendrogram Hasil Klastering', fontsize=16, color='black', weight='bold')
        ax.set_xlabel('Titik Data', fontsize=12, color='black')
        ax.set_ylabel('Jarak Euclidean', fontsize=12, color='black')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.grid(axis='y', linestyle='--', alpha=0.6)
    plt.tight_layout()
    img = io.BytesIO()
    plt.savefig(img, format='png', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    img.seek(0)
    plot_url = base64.b64encode(img.getvalue()).decode('utf8')
    dist_matrix_df = pd.DataFrame(dist_matrix_square, columns=df.index, index=df.index)
    return plot_url, dist_matrix_df

def center_data(df):
    return df.apply(lambda col: col - col.mean())

def scale_data(df, minnew, maxnew):
    return df.apply(lambda col: (col - col.min()) / (col.max() - col.min()) * (maxnew - minnew) + minnew if col.max() - col.min() != 0 else minnew)

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
        column_names = data.get('columns')
        values_list = data.get('values')
        analysis_type = data.get('analysis_type')
        data_dict, num_points = {}, -1
        for i, col_name in enumerate(column_names):
            values = [float(v.strip()) for v in values_list[i].split(',') if v.strip()]
            if i == 0: num_points = len(values)
            elif len(values) != num_points: return jsonify({'error': 'Jumlah nilai untuk semua variabel harus sama.'}), 400
            data_dict[col_name.strip()] = values
        if num_points == 0: return jsonify({'error': 'Tidak ada data nilai yang dimasukkan.'}), 400
        
        df = pd.DataFrame(data_dict)
        df.index = [f'Poin {i+1}' for i in range(len(df))]

        plot_url, dist_matrix_df, result_df = None, None, df.copy()
        minnew, maxnew = data.get('minnew'), data.get('maxnew')

        if analysis_type == 'centering':
            result_df = center_data(df)
        elif analysis_type == 'scaling':
            result_df = scale_data(df, float(minnew), float(maxnew))
        elif analysis_type == 'euclidean':
            if len(df) < 2: return jsonify({'error': 'Perhitungan Euclidean memerlukan minimal 2 data poin.'}), 400
            plot_url, dist_matrix_df = create_dendrogram(df)

        jakarta_tz = pytz.timezone('Asia/Jakarta')
        response_data = {
            'analysis_type': analysis_type,
            'input_data_html': clean_html_table(df.to_html(classes="data")),
            'result_data_html': clean_html_table(result_df.to_html(classes="data")),
            'plot_url': plot_url,
            'dist_matrix_html': clean_html_table(dist_matrix_df.to_html(classes="data")) if dist_matrix_df is not None else None,
            'created_at': datetime.now(jakarta_tz).isoformat(),
        }
        return jsonify(response_data)
    except Exception as e:
        return jsonify({'error': f'Terjadi kesalahan di server: {e}'}), 400

if __name__ == "__main__":
    app.run(debug=True)