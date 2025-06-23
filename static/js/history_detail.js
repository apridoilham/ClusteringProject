document.addEventListener('alpine:init', () => {
    Alpine.data('historyDetail', () => ({
        item: null,
        formattedDate: '',
        
        init() {
            const itemString = sessionStorage.getItem('historyDetailItem_v6');
            if (!itemString) {
                this.displayErrorState();
                return;
            }
            
            this.item = JSON.parse(itemString);
            const date = new Date(this.item.created_at);
            this.formattedDate = date.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' });
            this.renderDetailContent();
        },

        displayErrorState() {
            const detailContentContainer = document.getElementById('detail-content');
            if (detailContentContainer) {
                detailContentContainer.innerHTML = `
                    <div class="card error-card bg-bg-secondary border border-danger-red rounded-xl p-8 shadow-lg text-center py-8">
                        <h2 class="text-2xl font-semibold border-b border-danger-red pb-4 mb-6 flex items-center justify-center gap-3 text-danger-red">
                            <i class="fa-solid fa-triangle-exclamation"></i> Data Riwayat Tidak Ditemukan
                        </h2>
                        <p class="text-text-primary text-lg mb-8">Sepertinya data untuk riwayat ini telah hilang atau belum dipilih.</p>
                        <a href="/" class="btn btn-primary inline-flex items-center px-6 py-3 text-base font-semibold rounded-lg bg-accent-blue text-white hover:bg-accent-blue-hover transition-all duration-200">
                            <i class="fa-solid fa-arrow-left mr-2"></i> Kembali ke Dashboard
                        </a>
                    </div>
                `;
                const returnToDashboardBtn = document.getElementById('return-dashboard-btn');
                if (returnToDashboardBtn) returnToDashboardBtn.classList.add('hidden');
            } else {
                document.body.innerHTML = `
                    <div class="container mx-auto p-6 max-w-7xl w-full text-center py-16">
                        <h1 class="text-5xl font-bold text-danger-red mb-4">Error</h1>
                        <p class="text-xl text-text-secondary mt-4 mb-8">Data riwayat tidak ditemukan. Silakan kembali ke halaman utama.</p>
                        <a href="/" class="btn btn-primary inline-flex items-center px-6 py-3 text-base font-semibold rounded-lg bg-accent-blue text-white hover:bg-accent-blue-hover transition-all duration-200">Kembali ke Dashboard</a>
                    </div>
                `;
            }
        },

        renderDetailContent() {
            if (!this.item) return;

            document.getElementById('detail-badge').className = `badge px-4 py-2 rounded-full text-xs font-medium border
                ${this.item.analysis_type === 'centering' ? 'text-badge-centering-text border-badge-centering-border bg-badge-centering-bg' : ''}
                ${this.item.analysis_type === 'scaling' ? 'text-badge-scaling-text border-badge-scaling-border bg-badge-scaling-bg' : ''}
                ${this.item.analysis_type === 'euclidean' ? 'text-badge-euclidean-text border-badge-euclidean-border bg-badge-euclidean-bg' : ''}`;
            document.getElementById('detail-badge').textContent = this.item.analysis_type.charAt(0).toUpperCase() + this.item.analysis_type.slice(1);
            document.getElementById('detail-heading').innerHTML = `<i class="fa-solid fa-file-invoice text-accent-blue"></i>Detail Riwayat #${String(this.item.id).slice(-6)}`;
            document.getElementById('detail-timestamp').textContent = `Dibuat pada: ${this.formattedDate}`;

            let contentHTML = `
                <div class="result-detail-item">
                    <h2 class="section-heading text-2xl font-semibold border-b border-border-color pb-4 mb-6 flex items-center gap-3 text-text-primary"><i class="fa-solid fa-keyboard text-accent-blue"></i>Data Input</h2>
                    <div class="table-wrapper rounded-lg overflow-hidden border border-border-color">
                        <div class="table-container overflow-x-auto p-0">
                            ${this.item.input_data_html}
                        </div>
                    </div>
                </div>
                ${this.item.analysis_type !== 'euclidean' ? `
                    <div class="result-detail-item">
                        <h2 class="section-heading text-2xl font-semibold border-b border-border-color pb-4 mb-6 flex items-center gap-3 text-text-primary"><i class="fa-solid fa-table-cells text-accent-blue"></i>Hasil Perhitungan</h2>
                        <div class="table-wrapper rounded-lg overflow-hidden border border-border-color">
                            <div class="table-container overflow-x-auto p-0">
                                ${this.item.result_data_html}
                            </div>
                        </div>
                    </div>` : ''}
                ${this.item.dist_matrix_html ? `
                    <div class="result-detail-item">
                        <h2 class="section-heading text-2xl font-semibold border-b border-border-color pb-4 mb-6 flex items-center gap-3 text-text-primary"><i class="fa-solid fa-calculator text-accent-blue"></i>Matriks Jarak</h2>
                        <div class="table-wrapper rounded-lg overflow-hidden border border-border-color">
                            <div class="table-container overflow-x-auto p-0">
                                ${this.item.dist_matrix_html}
                            </div>
                        </div>
                    </div>` : ''}
                ${this.item.plot_url ? `
                    <div class="result-detail-item">
                        <div class="flex justify-between items-center border-b border-border-color pb-4 mb-6">
                            <h2 class="section-heading text-2xl font-semibold flex items-center gap-3 text-text-primary"><i class="fa-solid fa-chart-line text-accent-blue"></i>Dendrogram Klastering</h2>
                            <button class="btn-icon w-10 h-10 rounded-lg bg-bg-tertiary border border-border-color text-text-secondary hover:text-text-primary hover:border-border-light hover:bg-[#30363D] transition-all duration-200" title="Perbesar Dendrogram" x-data @click="window.dispatchEvent(new CustomEvent('open-image-modal', { detail: { imageUrl: 'data:image/png;base64,${this.item.plot_url}' } }))">
                                <i class="fa-solid fa-expand"></i>
                            </button>
                        </div>
                        <div class="dendrogram-wrapper rounded-xl p-6 bg-bg-secondary border border-border-color text-center overflow-x-auto">
                            <img src="data:image/png;base64,${this.item.plot_url}" alt="Dendrogram Klastering" class="block max-w-full h-auto mx-auto rounded-lg shadow-md">
                        </div>
                    </div>` : ''}
            `;

            const detailContentContainer = document.getElementById('detail-content');
            if (detailContentContainer) {
                detailContentContainer.innerHTML = contentHTML;
            }
        }
    }));
});