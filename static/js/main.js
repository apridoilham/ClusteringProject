document.addEventListener('DOMContentLoaded', () => {
    const App = {
        historyKey: 'clusteringHistory_v6',
        
        init() {
            this.cacheDOMElements();
            this.addEventListeners();
            this.renderHistory();
            this.introAnimation();
            this.updateRemoveButtonState();
        },

        cacheDOMElements() {
            this.form = document.getElementById('calculation-form');
            this.inputFieldsContainer = document.getElementById('input-fields');
            this.addVariableBtn = document.getElementById('add-variable-btn');
            this.removeVariableBtn = document.getElementById('remove-variable-btn');
            this.analysisSelect = document.getElementById('analysis-type-select');
            this.scalingOptions = document.getElementById('scaling-options');
            this.resultsContainer = document.getElementById('results-container');
            this.historyListContainer = document.getElementById('history-list-container');
            this.modal = document.getElementById('confirmation-modal');
            this.modalText = document.getElementById('modal-text');
            this.modalConfirmBtn = document.getElementById('modal-confirm-btn');
            this.modalCancelBtn = document.getElementById('modal-cancel-btn');
            this.submitBtn = this.form.querySelector('button[type="submit"]');
            this.submitBtnText = document.getElementById('submit-text');
            this.messageBox = document.getElementById('message-box');
            this.formCard = document.getElementById('form-card');
            this.sidebarCard = document.getElementById('sidebar').querySelector('.card');
        },

        addEventListeners() {
            this.addVariableBtn.addEventListener('click', () => this.addInput());
            this.removeVariableBtn.addEventListener('click', () => this.removeInput());
            this.analysisSelect.addEventListener('change', () => this.toggleScalingOptions());
            this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
            this.historyListContainer.addEventListener('click', (e) => this.handleHistoryAction(e));
            this.modalCancelBtn.addEventListener('click', () => this.hideModal(this.modal));
            this.modal.addEventListener('click', (e) => { if(e.target === this.modal) this.hideModal(this.modal) });
            document.addEventListener('click', (e) => {
                const copyBtn = e.target.closest('.copy-btn');
                if(copyBtn) this.copyTableToCSV(copyBtn);
            });
        },

        introAnimation() {
            gsap.set([this.formCard, this.sidebarCard], { opacity: 0, y: 30 });
            gsap.set(["header h1", "header p"], { opacity: 0, y: -20 });

            gsap.to("header h1", { duration: 0.8, y: 0, opacity: 1, ease: "power3.out" });
            gsap.to("header p", { duration: 0.8, y: 0, opacity: 1, ease: "power3.out", delay: 0.2 });

            gsap.to(this.formCard, { duration: 0.8, y: 0, opacity: 1, ease: "power3.out", delay: 0.4 });
            gsap.to(this.sidebarCard, { duration: 0.8, y: 0, opacity: 1, ease: "power3.out", delay: 0.6 });
        },

        addInput() {
            const index = this.inputFieldsContainer.children.length + 1;
            const newGroup = document.createElement('div');
            newGroup.className = 'input-group space-y-2';
            newGroup.innerHTML = `
                ${index > 1 ? '<hr class="border-t border-border-color my-4 opacity-30">' : ''}
                <div>
                    <label class="input-label" for="column-name-${index}">Nama Variabel ${index}</label>
                    <input type="text" id="column-name-${index}" name="columns[]" placeholder="Nama Variabel (cth: Luminositas)" required class="input-field">
                </div>
                <div>
                    <label class="input-label" for="values-${index}">Nilai Variabel ${index}</label>
                    <input type="text" id="values-${index}" name="values[]" placeholder="Nilai (dipisah koma, cth: 1,2,3)" required class="input-field">
                </div>
            `;
            this.inputFieldsContainer.appendChild(newGroup);
            gsap.from(newGroup, { duration: 0.5, y: -20, opacity: 0, ease: 'power2.out' });
            this.updateRemoveButtonState();
        },

        removeInput() {
            if (this.inputFieldsContainer.children.length > 1) {
                const lastGroup = this.inputFieldsContainer.lastElementChild;
                gsap.to(lastGroup, { duration: 0.4, x: 50, opacity: 0, ease: 'power2.in', onComplete: () => {
                    lastGroup.remove();
                    this.updateInputLabels();
                    this.updateRemoveButtonState();
                }});
            }
        },

        updateInputLabels() {
            Array.from(this.inputFieldsContainer.children).forEach((group, index) => {
                group.querySelector('.input-label[for^="column-name-"]').textContent = `Nama Variabel ${index + 1}`;
                group.querySelector('.input-label[for^="values-"]').textContent = `Nilai Variabel ${index + 1}`;
                group.querySelector('input[name="columns[]"]').id = `column-name-${index + 1}`;
                group.querySelector('input[name="values[]"]').id = `values-${index + 1}`;
                const hr = group.querySelector('hr');
                if (index === 0) {
                    if (hr) hr.remove();
                } else {
                    if (!hr) {
                        const newHr = document.createElement('hr');
                        newHr.className = 'border-t border-border-color my-4 opacity-30';
                        group.prepend(newHr);
                    }
                }
            });
        },

        updateRemoveButtonState() {
            if (this.inputFieldsContainer.children.length <= 1) {
                this.removeVariableBtn.disabled = true;
                this.removeVariableBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                this.removeVariableBtn.disabled = false;
                this.removeVariableBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        },

        toggleScalingOptions() {
            const isScaling = this.analysisSelect.value === 'scaling';
            gsap.to(this.scalingOptions, {
                height: isScaling ? 'auto' : 0,
                opacity: isScaling ? 1 : 0,
                marginTop: isScaling ? '1.5rem' : 0,
                duration: 0.4,
                ease: 'power2.out',
                onComplete: () => { 
                    if (isScaling) {
                        this.scalingOptions.classList.remove('hidden'); 
                    } else {
                        this.scalingOptions.classList.add('hidden'); 
                    }
                }
            });
             if (isScaling) {
                this.scalingOptions.classList.remove('hidden');
            } else {
                this.scalingOptions.classList.remove('hidden');
            }
        },

        async handleFormSubmit(e) {
            e.preventDefault();
            await this.clearResults();

            const columnInputs = Array.from(this.form.querySelectorAll('input[name="columns[]"]'));
            const valueInputs = Array.from(this.form.querySelectorAll('input[name="values[]"]'));
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
                    
                    if (/[^0-9.,\s-]/.test(valString)) {
                        validationError = `Nilai untuk variabel "${colName}" mengandung karakter tidak valid. Gunakan hanya angka, koma, titik, spasi, dan tanda hubung (-).`;
                        break;
                    }

                    const values = valString.split(',').map(v => v.trim()).filter(v => v !== '');
                    if (values.length === 0) {
                        validationError = `Nilai untuk variabel "${colName}" tidak boleh kosong setelah diparsing.`;
                        break;
                    }

                    if (values.some(v => isNaN(parseFloat(v)))) {
                        validationError = `Nilai untuk variabel "${colName}" mengandung data yang bukan angka.`;
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

            this.submitBtn.disabled = true;
            this.submitBtnText.innerHTML = `<span class="loading-spinner"></span> Memproses...`;

            const formData = new FormData(this.form);
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
                    this.submitBtn.disabled = false;
                    this.submitBtnText.innerHTML = `<i class="fa-solid fa-meteor"></i> Jalankan Analisis`;
                    return;
                }
                if (minNewVal >= maxNewVal) {
                    this.displayError('Nilai Minimum Baru harus lebih kecil dari Nilai Maksimum Baru untuk Scaling.');
                    this.submitBtn.disabled = false;
                    this.submitBtnText.innerHTML = `<i class="fa-solid fa-meteor"></i> Jalankan Analisis`;
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
                this.submitBtn.disabled = false;
                this.submitBtnText.innerHTML = `<i class="fa-solid fa-meteor"></i> Jalankan Analisis`;
            }
        },

        clearResults() {
            const currentResults = this.resultsContainer.querySelector('.result-card, .error-card');
            if (currentResults) {
                return new Promise(resolve => {
                    gsap.to(currentResults, {
                        duration: 0.5,
                        opacity: 0,
                        y: -30,
                        onComplete: () => {
                            this.resultsContainer.innerHTML = '';
                            resolve();
                        }
                    });
                });
            }
            return Promise.resolve();
        },

        displayResult(result) {
            let contentHTML = `
                <div class="card result-card space-y-8" style="opacity: 0; transform: translateY(30px);">
                    ${result.analysis_type !== 'euclidean' ? `
                        <div>
                            <div class="table-header">
                                <h3 class="table-title">Hasil ${result.analysis_type.charAt(0).toUpperCase() + result.analysis_type.slice(1)}</h3>
                                <button class="btn-icon copy-btn" title="Salin sebagai CSV"><i class="fa-solid fa-clipboard"></i></button>
                            </div>
                            <div class="table-container">${result.result_data_html}</div>
                        </div>` : ''}
                    ${result.dist_matrix_html ? `
                        <div>
                            <div class="table-header">
                                <h3 class="table-title">Matriks Jarak Euclidean</h3>
                                <button class="btn-icon copy-btn" title="Salin sebagai CSV"><i class="fa-solid fa-clipboard"></i></button>
                            </div>
                            <div class="table-container">${result.dist_matrix_html}</div>
                        </div>` : ''}
                    ${result.plot_url ? `
                        <div id="dendrogram-section">
                            <h3 class="section-heading"><i class="fa-solid fa-chart-sankey"></i>Dendrogram Klastering</h3>
                            <div class="dendrogram-wrapper">
                                <img src="data:image/png;base64,${result.plot_url}" alt="Dendrogram Hasil Klastering">
                            </div>
                        </div>` : ''}
                </div>`;
            this.resultsContainer.innerHTML = contentHTML;
            gsap.to(this.resultsContainer.querySelector('.result-card'), { duration: 0.8, y: 0, opacity: 1, ease: 'power3.out' });
        },
        
        displayError(message) {
            const errorHTML = `
                <div class="card error-card" id="error-card" style="opacity: 0; transform: translateY(30px);">
                    <h3 class="section-heading error-heading">
                        <i class="fa-solid fa-triangle-exclamation"></i> Input Tidak Valid
                    </h3>
                    <p class="error-text">${message}</p>
                </div>
            `;
            this.resultsContainer.innerHTML = errorHTML;
            gsap.to("#error-card", { duration: 0.5, y: 0, opacity: 1, ease: 'power2.out' });
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
            const history = this.getHistory();
            const scrollPos = this.historyListContainer.scrollTop;

            const newHistoryHTML = history.length === 0
                ? `<p class="text-center text-sm text-secondary py-4">Riwayat analisis akan muncul di sini.</p>`
                : history.map(item => {
                    const date = new Date(item.created_at);
                    const formattedDate = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                    const formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    return `<div class="history-card" data-id="${item.id}">
                                <div class="history-header">
                                    <div class="history-title">
                                        <span class="badge ${item.analysis_type}">${item.analysis_type}</span>
                                    </div>
                                    <div class="history-actions">
                                        <a href="/history-detail" class="btn-icon view-detail-btn" title="Lihat Detail"><i class="fa-solid fa-eye"></i></a>
                                        <button class="btn-icon delete-item-btn" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                                <div class="history-meta">
                                    <i class="fa-solid fa-calendar-alt"></i> ${formattedDate} <i class="fa-solid fa-clock"></i> ${formattedTime}
                                </div>
                            </div>`;
                }).join('');
            
            this.historyListContainer.innerHTML = newHistoryHTML;
            
            this.historyListContainer.scrollTop = scrollPos;
        },

        handleHistoryAction(e) {
            const target = e.target.closest('a, button');
            if (!target) return;
            const historyCard = target.closest('.history-card');
            if (!historyCard) return;
            const id = historyCard.dataset.id;
            
            if (target.classList.contains('view-detail-btn')) {
                e.preventDefault();
                const item = this.getHistory().find(h => h.id == id);
                if (item) {
                    sessionStorage.setItem('historyDetailItem_v6', JSON.stringify(item));
                    window.location.href = '/history-detail';
                } else {
                    this.displayMessage('Item riwayat tidak ditemukan!', 'error');
                }
            } else if (target.classList.contains('delete-item-btn')) {
                this.showConfirmation(`Yakin ingin menghapus riwayat #${String(id).slice(-6)}?`, () => {
                    this.deleteHistoryItem(id);
                });
            }
        },
        
        deleteHistoryItem(id) {
            const card = this.historyListContainer.querySelector(`.history-card[data-id="${id}"]`);
            if (card) {
                // Sembunyikan dan hapus elemen dari DOM dengan animasi
                gsap.to(card, {
                    duration: 0.5,
                    opacity: 0,
                    x: -50,
                    ease: 'power2.in',
                    onComplete: () => {
                        card.remove(); 
                        // Setelah elemen dihapus sepenuhnya dari DOM, baru perbarui data dan render ulang daftar
                        const history = this.getHistory().filter(h => h.id != id);
                        localStorage.setItem(this.historyKey, JSON.stringify(history));
                        // Render ulang setelah penundaan singkat untuk memastikan DOM settle
                        setTimeout(() => {
                            this.renderHistory(); 
                            this.displayMessage('Item riwayat berhasil dihapus!', 'success');
                        }, 50); // Penundaan 50ms
                    }
                });
            } else {
                // Jika elemen tidak ditemukan, perbarui data dan render ulang tanpa animasi kartu
                const history = this.getHistory().filter(h => h.id != id);
                localStorage.setItem(this.historyKey, JSON.stringify(history));
                this.renderHistory();
                this.displayMessage('Item riwayat berhasil dihapus!', 'success');
            }
        },
        
        copyTableToCSV(btn) {
            const tableContainer = btn.closest('.table-header').nextElementSibling;
            const table = tableContainer.querySelector('table');
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
                    console.error('Failed to copy: ', err);
                });
        },

        showConfirmation(text, onConfirm) {
            this.modalText.textContent = text;
            this.showModal(this.modal);
            this.modalConfirmBtn.onclick = () => { onConfirm(); this.hideModal(this.modal); };
        },

        showModal(modal) {
            modal.classList.add('active');
            gsap.fromTo(modal.querySelector('.modal-content'), { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' });
        },
        
        hideModal(modal) {
            gsap.to(modal, { opacity: 0, duration: 0.3, onComplete: () => modal.classList.remove('active') });
        },

        displayMessage(message, type = 'info', duration = 3000) {
            this.messageBox.textContent = '';
            this.messageBox.classList.remove('bg-success-green', 'bg-danger-red', 'bg-accent-blue');

            const icon = document.createElement('i');
            icon.classList.add('fa-solid');

            if (type === 'success') {
                this.messageBox.classList.add('bg-success-green');
                icon.classList.add('fa-check-circle');
            } else if (type === 'error') {
                this.messageBox.classList.add('bg-danger-red');
                icon.classList.add('fa-exclamation-triangle');
            } else {
                this.messageBox.classList.add('bg-accent-blue');
                icon.classList.add('fa-info-circle');
            }

            this.messageBox.appendChild(icon);
            this.messageBox.innerHTML += ` ${message}`;

            this.messageBox.classList.add('show');
            setTimeout(() => {
                this.messageBox.classList.remove('show');
            }, duration);
        }
    };
    App.init();
});