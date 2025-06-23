document.addEventListener('alpine:init', () => {
    Alpine.data('appData', () => ({
        historyKey: 'clusteringHistory_v6',
        inputFields: [{ columnName: '', values: '' }],
        analysisType: 'centering',
        
        init() {
            console.log('appData: init called'); // DEBUG
            this.renderHistory();
            this.introAnimation();

            // --- Event Delegation untuk tombol riwayat (Lihat Detail & Hapus) ---
            // Listener ini dipasang SEKALI saat aplikasi diinisialisasi
            const historyListContainer = document.getElementById('history-list-container');
            if (historyListContainer) {
                historyListContainer.addEventListener('click', (e) => {
                    // Cek apakah yang diklik adalah tombol delete atau leluhur terdekatnya
                    const clickedDeleteButton = e.target.closest('.js-delete-history-item');
                    if (clickedDeleteButton) {
                        e.preventDefault(); // Mencegah aksi default (misal, navigasi jika itu link)
                        const id = clickedDeleteButton.dataset.id;
                        console.log('main.js: Tombol delete (via delegasi) diklik untuk ID:', id); // DEBUG
                        window.dispatchEvent(new CustomEvent('modal-open', { // Memicu modal konfirmasi
                            detail: {
                                text: `Yakin ingin menghapus riwayat #${String(id).slice(-6)}?`,
                                onConfirm: () => this.deleteHistoryItem(id) // Fungsi yang akan dijalankan jika dikonfirmasi
                            }
                        }));
                        return; // Penting: Hentikan pemrosesan lebih lanjut jika tombol delete diklik
                    }

                    // Cek apakah yang diklik adalah tombol view detail atau leluhur terdekatnya
                    const viewButton = e.target.closest('.js-view-detail-btn');
                    if (viewButton) { 
                        e.preventDefault();
                        const id = viewButton.dataset.id;
                        console.log('main.js: Tombol view detail (via delegasi) diklik untuk ID:', id); // DEBUG
                        // Langsung panggil logika navigasi untuk view detail
                        const item = this.getHistory().find(h => h.id == id);
                        if (item) {
                            sessionStorage.setItem('historyDetailItem_v6', JSON.stringify(item));
                            window.location.href = '/history-detail';
                        } else {
                            this.displayMessage('Item riwayat tidak ditemukan!', 'error');
                        }
                    }
                });
            }
            // --- Akhir Event Delegation ---
        },

        introAnimation() {
            gsap.set(["#form-card", "#sidebar .card"], { opacity: 0, y: 30 });
            gsap.set(["header h1", "header p"], { opacity: 0, y: -20 });

            gsap.to("header h1", { duration: 0.8, y: 0, opacity: 1, ease: "power3.out" });
            gsap.to("header p", { duration: 0.8, y: 0, opacity: 1, ease: "power3.out", delay: 0.2 });

            gsap.to("#form-card", { duration: 0.8, y: 0, opacity: 1, ease: "power3.out", delay: 0.4 });
            gsap.to("#sidebar .card", { duration: 0.8, y: 0, opacity: 1, ease: "power3.out", delay: 0.6 });
        },

        addInput() {
            this.inputFields.push({ columnName: '', values: '' });
            this.$nextTick(() => {
                const newGroup = document.querySelector(`.input-group[data-index="${this.inputFields.length - 1}"]`);
                if (newGroup) {
                    gsap.from(newGroup, { duration: 0.5, y: -20, opacity: 0, ease: 'power2.out' });
                }
            });
        },

        removeInput() {
            if (this.inputFields.length > 1) {
                const lastIndex = this.inputFields.length - 1;
                const lastGroup = document.querySelector(`.input-group[data-index="${lastIndex}"]`);
                if (lastGroup) {
                    gsap.to(lastGroup, { duration: 0.4, x: 50, opacity: 0, ease: 'power2.in', onComplete: () => {
                        this.inputFields.pop();
                    }});
                } else {
                    this.inputFields.pop();
                }
            }
        },

        toggleScalingOptions() {
            // Alpine.js handles the 'hidden' class and transitions based on analysisType
        },

        async handleFormSubmit(event) {
            event.preventDefault();
            await this.clearResults();

            const form = event.target;
            const columnInputs = Array.from(form.querySelectorAll('input[name="columns[]"]'));
            const valueInputs = Array.from(form.querySelectorAll('input[name="values[]"]'));
            let firstValueCount = -1;
            let validationError = null;
            let hasValidData = false;

            const inputDataForValidation = [];
            for(let i = 0; i < columnInputs.length; i++) {
                const colName = columnInputs[i].value.trim();
                const valString = valueInputs[i].value.trim();
                if (colName || valString) {
                    inputDataForValidation.push({ colName, valString });
                }
            }

            if (inputDataForValidation.length === 0) {
                validationError = 'Mohon masukkan setidaknya satu data variabel yang valid.';
            } else {
                for (const { colName, valString } of inputDataForValidation) {
                    if (!colName) {
                        validationError = 'Nama variabel tidak boleh kosong untuk setiap baris data yang diisi.';
                        break;
                    }
                    if (!valString) {
                        validationError = `Nilai untuk variabel "${colName}" tidak boleh kosong.`;
                        break;
                    }

                    if (/[^0-9,\s-]/.test(valString)) {
                        validationError = `Nilai untuk variabel "${colName}" mengandung karakter tidak valid. Gunakan hanya bilangan bulat, koma, spasi, dan tanda hubung (-).`;
                        break;
                    }

                    const values = valString.split(/[, ]+/).map(v => v.trim()).filter(v => v !== '');
                    if (values.length === 0) {
                        validationError = `Nilai untuk variabel "${colName}" tidak boleh kosong setelah diparsing.`;
                        break;
                    }

                    if (values.some(v => !Number.isInteger(parseFloat(v)))) {
                        validationError = `Nilai untuk variabel "${colName}" mengandung data yang bukan bilangan bulat.`;
                        break;
                    }

                    if (firstValueCount === -1) {
                        firstValueCount = values.length;
                    } else if (values.length !== firstValueCount) {
                        validationError = 'Jumlah nilai untuk setiap variabel harus sama (konsisten).';
                        break;
                    }
                    hasValidData = true;
                }
            }
            
            if (!hasValidData && !validationError) {
                validationError = 'Mohon masukkan setidaknya satu data variabel yang valid.';
            }

            if (validationError) {
                this.displayError(validationError);
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const submitBtnText = form.querySelector('#submit-text');
            submitBtn.disabled = true;
            submitBtnText.innerHTML = `<span class="loading-spinner w-5 h-5 mr-3 border-2 border-white border-t-accent-blue rounded-full animate-spin"></span> Memproses...`;

            const formData = new FormData(form);
            const data = {
                columns: formData.getAll('columns[]').filter((_, i) => columnInputs[i].value.trim() !== '' && valueInputs[i].value.trim() !== ''),
                values: formData.getAll('values[]').filter((_, i) => columnInputs[i].value.trim() !== '' && valueInputs[i].value.trim() !== ''),
                analysis_type: formData.get('analysis_type'),
                minnew: formData.get('minnew'),
                maxnew: formData.get('maxnew'),
            };

            if (data.analysis_type === 'scaling') {
                const minNewVal = parseFloat(data.minnew);
                const maxNewVal = parseFloat(data.maxnew);
                if (isNaN(minNewVal) || isNaN(maxNewVal)) {
                    this.displayError('Nilai Minimum Baru dan Maksimum Baru harus berupa angka untuk Scaling.');
                    submitBtn.disabled = false;
                    submitBtnText.innerHTML = `<i class="fa-solid fa-meteor mr-3"></i> Jalankan Analisis`;
                    return;
                }
                if (minNewVal >= maxNewVal) {
                    this.displayError('Nilai Minimum Baru harus lebih kecil dari Nilai Maksimum Baru untuk Scaling.');
                    submitBtn.disabled = false;
                    submitBtnText.innerHTML = `<i class="fa-solid fa-meteor mr-3"></i> Jalankan Analisis`;
                    return;
                }
            }

            try {
                const response = await fetch('/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();

                if (!response.ok) {
                    const errorMsg = result.error || 'Terjadi kesalahan tidak dikenal saat memproses analisis.';
                    throw new Error(errorMsg);
                }
                
                this.displayResult(result);
                const historyEntry = { ...data, ...result, id: Date.now(), created_at: result.created_at };
                this.saveToHistory(historyEntry);
                this.renderHistory(); 

            } catch (error) {
                this.displayError(error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtnText.innerHTML = `<i class="fa-solid fa-meteor mr-3"></i> Jalankan Analisis`;
            }
        },

        clearResults() {
            const resultsContainer = document.getElementById('results-container');
            const currentResults = resultsContainer.querySelector('.result-card, .error-card');
            if (currentResults) {
                return new Promise(resolve => {
                    gsap.to(currentResults, {
                        duration: 0.5,
                        opacity: 0,
                        y: -30,
                        onComplete: () => {
                            resultsContainer.innerHTML = '';
                            resolve();
                        }
                    });
                });
            }
            return Promise.resolve();
        },

        displayResult(result) {
            const resultsContainer = document.getElementById('results-container');
            let contentHTML = `
                <div class="card bg-bg-secondary border border-border-color rounded-xl p-8 shadow-lg result-card animate-fade-in-up">
                    ${result.analysis_type !== 'euclidean' ? `
                        <div class="mb-8">
                            <div class="flex justify-between items-center border-b border-border-color pb-4 mb-4">
                                <h3 class="text-xl font-semibold text-text-primary">Hasil ${result.analysis_type.charAt(0).toUpperCase() + result.analysis_type.slice(1)}</h3>
                                </div>
                            <div class="table-container overflow-x-auto rounded-lg border border-border-color">
                                ${result.result_data_html}
                            </div>
                        </div>` : ''}
                    ${result.dist_matrix_html ? `
                        <div class="mb-8">
                            <div class="flex justify-between items-center border-b border-border-color pb-4 mb-4">
                                <h3 class="text-xl font-semibold text-text-primary">Matriks Jarak Euclidean</h3>
                                </div>
                            <div class="table-container overflow-x-auto rounded-lg border border-border-color">
                                ${result.dist_matrix_html}
                            </div>
                        </div>` : ''}
                    ${result.plot_url ? `
                        <div id="dendrogram-section">
                            <div class="flex justify-between items-center border-b border-border-color pb-4 mb-6">
                                <h3 class="section-heading text-2xl font-semibold flex items-center gap-3 text-text-primary"><i class="fa-solid fa-chart-line text-accent-blue"></i>Dendrogram Klastering</h3>
                                <button class="js-enlarge-dendrogram btn-icon w-10 h-10 rounded-lg bg-bg-tertiary border border-border-color text-text-secondary hover:text-text-primary hover:border-border-light hover:bg-[#30363D] transition-all duration-200" title="Perbesar Dendrogram" data-image-url="data:image/png;base64,${result.plot_url}">
                                    <i class="fa-solid fa-expand"></i>
                                </button>
                            </div>
                            <div class="dendrogram-wrapper rounded-xl p-6 bg-bg-secondary border border-border-color text-center overflow-x-auto">
                                <img src="data:image/png;base64,${result.plot_url}" alt="Dendrogram Hasil Klastering" class="block max-w-full h-auto mx-auto rounded-lg shadow-md">
                            </div>
                        </div>` : ''}
                </div>`;
            resultsContainer.innerHTML = contentHTML;

            // --- Attach event listener setelah innerHTML diperbarui ---
            this.$nextTick(() => { 
                if (result.plot_url) {
                    const enlargeButton = resultsContainer.querySelector('.js-enlarge-dendrogram');
                    if (enlargeButton) {
                        console.log('main.js: Tombol perbesar ditemukan setelah $nextTick. Mencoba attach listener.'); 
                        enlargeButton.addEventListener('click', (e) => {
                            const imageUrl = e.currentTarget.dataset.imageUrl;
                            console.log('main.js: Tombol diklik, memicu open-image-modal dengan URL:', imageUrl.substring(0, 50) + '...'); 
                            window.dispatchEvent(new CustomEvent('open-image-modal', { detail: { imageUrl: imageUrl } }));
                        });
                    } else {
                        console.error('main.js: ERROR: Tombol perbesar tidak ditemukan setelah $nextTick.'); 
                    }
                }
            });
            // --- Akhir Perbaikan ---
        },
        
        displayError(message) {
            const resultsContainer = document.getElementById('results-container');
            const errorHTML = `
                <div class="card bg-bg-secondary border border-danger-red rounded-xl p-8 shadow-lg error-card animate-fade-in-up" id="error-card">
                    <h3 class="section-heading text-2xl font-semibold border-b border-danger-red pb-4 mb-6 flex items-center gap-3 text-danger-red">
                        <i class="fa-solid fa-triangle-exclamation"></i> Input Tidak Valid
                    </h3>
                    <p class="text-text-primary text-lg">${message}</p>
                </div>
            `;
            resultsContainer.innerHTML = errorHTML;
        },

        getHistory() {
            return JSON.parse(localStorage.getItem(this.historyKey)) || [];
        },
        
        saveToHistory(entry) {
            let history = this.getHistory();
            history.unshift(entry);
            localStorage.setItem(this.historyKey, JSON.stringify(history.slice(0, 20)));
        },

        renderHistory() {
            console.log('main.js: renderHistory called'); 
            const historyListContainer = document.getElementById('history-list-container');
            const scrollPos = historyListContainer.scrollTop;

            const history = this.getHistory();
            if (history.length === 0) {
                historyListContainer.innerHTML = `<p class="text-center text-sm text-text-secondary py-4">Riwayat analisis akan muncul di sini.</p>`;
                return;
            }

            let newHistoryHTML = '';
            history.forEach(item => {
                const date = new Date(item.created_at);
                const formattedDate = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                const formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                newHistoryHTML += `
                    <div class="history-card bg-bg-primary border border-border-color rounded-lg p-5 transition-all duration-200 cursor-pointer hover:bg-bg-tertiary hover:border-accent-blue hover:shadow-md" data-id="${item.id}">
                        <div class="flex justify-between items-center mb-3">
                            <div class="flex items-center gap-3 font-semibold text-lg">
                                <span class="badge px-3 py-1 rounded-full text-xs font-medium border
                                    ${item.analysis_type === 'centering' ? 'text-badge-centering-text border-badge-centering-border bg-badge-centering-bg' : ''}
                                    ${item.analysis_type === 'scaling' ? 'text-badge-scaling-text border-badge-scaling-border bg-badge-scaling-bg' : ''}
                                    ${item.analysis_type === 'euclidean' ? 'text-badge-euclidean-text border-badge-euclidean-border bg-badge-euclidean-bg' : ''}">
                                    ${item.analysis_type.charAt(0).toUpperCase() + item.analysis_type.slice(1)}
                                </span>
                            </div>
                            <div class="flex gap-2 items-center">
                                <a href="#" class="js-view-detail-btn btn-icon w-8 h-8 rounded-md bg-bg-tertiary border border-border-color text-text-secondary flex items-center justify-center hover:text-text-primary hover:border-border-light hover:bg-[#30363D] transition-all duration-200" title="Lihat Detail" data-id="${item.id}">
                                    <i class="fa-solid fa-eye"></i> </a>
                                <button class="js-delete-history-item btn-icon w-8 h-8 rounded-md bg-bg-tertiary border border-border-color text-text-secondary flex items-center justify-center hover:text-text-primary hover:border-border-light hover:bg-[#30363D] transition-all duration-200" title="Hapus" data-id="${item.id}">
                                    <i class="fa-solid fa-trash"></i> </button>
                            </div>
                        </div>
                        <div class="text-text-secondary text-xs flex items-center gap-2">
                            <i class="fa-solid fa-calendar-alt"></i> ${formattedDate}
                            <i class="fa-solid fa-clock ml-3"></i> ${formattedTime}
                        </div>
                    </div>`;
            });
            
            historyListContainer.innerHTML = newHistoryHTML;
            historyListContainer.scrollTop = scrollPos;

            // Delegasi Event HANYA di init() sekarang menangani ini
            // Tidak ada kode langsung di sini untuk melampirkan listeners
        },

        handleHistoryAction(e, actionType) {
            // handleHistoryAction tidak lagi dipanggil langsung oleh tombol
            // melainkan oleh delegasi event di init(). Logika sudah dipindahkan ke sana.
        },
        
        deleteHistoryItem(id) {
            console.log('main.js: deleteHistoryItem called for ID:', id); 
            const card = document.querySelector(`.history-card[data-id="${id}"]`);
            if (card) {
                gsap.to(card, {
                    duration: 0.5,
                    opacity: 0,
                    x: -50,
                    ease: 'power2.in',
                    onComplete: () => {
                        const history = this.getHistory().filter(h => h.id != id);
                        localStorage.setItem(this.historyKey, JSON.stringify(history));
                        this.renderHistory();
                        this.displayMessage('Item riwayat berhasil dihapus!', 'success');
                    }
                });
            } else {
                const history = this.getHistory().filter(h => h.id != id);
                localStorage.setItem(this.historyKey, JSON.stringify(history));
                this.renderHistory();
                this.displayMessage('Item riwayat berhasil dihapus!', 'success');
            }
        },
        
        copyTableToCSV(btn) {
            // Fungsi ini sekarang tidak terpicu karena tombolnya sudah dihapus dari HTML
            // Namun, tetap ada di sini jika Anda ingin menggunakannya lagi di masa depan.
            console.log("copyTableToCSV dipanggil, tetapi tombol telah dihapus.");
            const tableContainer = btn.closest('.mb-8').querySelector('.table-container');
            const table = tableContainer ? tableContainer.querySelector('table') : null;
            if (!table) {
                this.displayMessage('Tidak ada tabel yang dapat disalin.', 'error');
                return;
            }

            let csv = [];
            const headers = Array.from(table.querySelectorAll('th')).map(th => `"${th.innerText.trim().replace(/"/g, '""')}"`).join(',');
            csv.push(headers);

            table.querySelectorAll('tr').forEach(row => {
                if (row.querySelector('th')) return;
                const rowData = Array.from(row.querySelectorAll('td')).map(cell => `"${cell.innerText.trim().replace(/"/g, '""')}"`).join(',');
                csv.push(rowData);
            });
            
            navigator.clipboard.writeText(csv.join('\n'))
                .then(() => {
                    this.displayMessage('Tabel berhasil disalin ke clipboard!', 'success');
                })
                .catch(err => {
                    this.displayMessage('Gagal menyalin tabel.', 'error');
                });
        },

        displayMessage(message, type = 'info') {
            const messageBox = document.getElementById('message-box');
            if (messageBox) { // Ensure messageBox exists, it's defined in base.html now
                messageBox.textContent = '';
                messageBox.classList.remove('bg-success-green', 'bg-danger-red', 'bg-accent-blue', 'show');

                let iconClass = '';
                if (type === 'success') {
                    messageBox.classList.add('bg-success-green');
                    iconClass = 'fa-check-circle';
                } else if (type === 'error') {
                    messageBox.classList.add('fa-exclamation-triangle');
                } else {
                    messageBox.classList.add('fa-info-circle');
                }

                const icon = document.createElement('i');
                icon.classList.add('fa-solid', iconClass);
                messageBox.appendChild(icon);
                messageBox.innerHTML += ` ${message}`;

                messageBox.classList.add('show');
                setTimeout(() => {
                    messageBox.classList.remove('show');
                }, 3000);
            }
        }
    }));
});