document.addEventListener('DOMContentLoaded', () => {
    const itemString = sessionStorage.getItem('historyDetailItem_v6');
    const detailContentContainer = document.getElementById('detail-content');
    const returnToDashboardBtn = document.getElementById('return-dashboard-btn');

    if (!itemString) {
        if (detailContentContainer) {
            detailContentContainer.innerHTML = `
                <div class="card error-card text-center py-8">
                    <h2 class="section-heading error-heading">
                        <i class="fa-solid fa-triangle-exclamation"></i> Data Riwayat Tidak Ditemukan
                    </h2>
                    <p class="error-text">Sepertinya data untuk riwayat ini telah hilang atau belum dipilih.</p>
                    <a href="/" class="btn btn-primary mt-6"><i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard</a>
                </div>
            `;
            if (returnToDashboardBtn) returnToDashboardBtn.classList.add('hidden');
        } else {
            document.body.innerHTML = `
                <div class="container text-center py-8">
                    <h1 class="text-4xl font-bold text-danger-red">Error</h1>
                    <p class="text-lg text-secondary mt-4">Data riwayat tidak ditemukan. Silakan kembali ke halaman utama.</p>
                    <a href="/" class="btn btn-primary mt-6">Kembali ke Dashboard</a>
                </div>
            `;
        }
        return;
    }

    const item = JSON.parse(itemString);
    const formattedDate = new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' });

    document.getElementById('detail-badge').className = `badge ${item.analysis_type}`;
    document.getElementById('detail-badge').textContent = item.analysis_type.charAt(0).toUpperCase() + item.analysis_type.slice(1);
    document.getElementById('detail-heading').innerHTML = `<i class="fa-solid fa-file-invoice"></i>Detail Riwayat #${String(item.id).slice(-6)}`;
    document.getElementById('detail-timestamp').textContent = `Dibuat pada: ${formattedDate}`;

    let contentHTML = `
        <div class="result-detail-item">
            <h2 class="section-heading"><i class="fa-solid fa-keyboard"></i>Data Input</h2>
            <div class="table-wrapper"><div class="table-container">${item.input_data_html}</div></div>
        </div>
        ${item.analysis_type !== 'euclidean' ? `
            <div class="result-detail-item">
                <h2 class="section-heading"><i class="fa-solid fa-table-cells"></i>Hasil Perhitungan</h2>
                <div class="table-wrapper"><div class="table-container">${item.result_data_html}</div></div>
            </div>` : ''}
        ${item.dist_matrix_html ? `
            <div class="result-detail-item">
                <h2 class="section-heading"><i class="fa-solid fa-calculator"></i>Matriks Jarak</h2>
                <div class="table-wrapper"><div class="table-container">${item.dist_matrix_html}</div></div>
            </div>` : ''}
        ${item.plot_url ? `
            <div class="result-detail-item">
                <h2 class="section-heading"><i class="fa-solid fa-chart-sankey"></i>Dendrogram Klastering</h2>
                <div class="dendrogram-wrapper"><img src="data:image/png;base64,${item.plot_url}" alt="Dendrogram Klastering"></div>
            </div>` : ''}
    `;

    if (detailContentContainer) {
        detailContentContainer.innerHTML = contentHTML;
    }
});