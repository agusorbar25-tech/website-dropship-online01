// Application State
window.activeItems = [];
window.archivedItems = [];
window.selectedFolderDate = getTodayDateString();
window.isLocalEditing = false;
let activeRowForUpload = null;
window.userName = localStorage.getItem('dropship_username') || 'Pengguna ' + Math.floor(100 + Math.random() * 900);

function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateFriendly(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

function loadInitialData() {
    const storedActive = localStorage.getItem('dropship_active');
    const storedArchived = localStorage.getItem('dropship_archived');

    if (storedActive) {
        window.activeItems = JSON.parse(storedActive);
    } else {
        // Baris Default Awal Sesuai Sketsa
        window.activeItems = [
            { id: 101, name: 'slebor Canter', qty: '1 Psg', image: '', ready: true },
            { id: 102, name: 'slebor Canter', qty: '1 Psg', image: '', ready: true },
            { id: 103, name: 'slebor Canter', qty: '1 Psg', image: '', ready: true }
        ];
    }

    if (storedArchived) {
        window.archivedItems = JSON.parse(storedArchived);
    }
    updateUserDisplay();
}

function updateUserDisplay() {
    document.getElementById('user-display-name').textContent = window.userName;
}

function changeUserName() {
    const newName = prompt("Masukkan Nama Anda / ID Tim:", window.userName);
    if (newName && newName.trim() !== "") {
        window.userName = newName.trim();
        localStorage.setItem('dropship_username', window.userName);
        updateUserDisplay();
        showToast(`Nama diubah menjadi: ${window.userName}`);
    }
}

function triggerCloudSync() {
    if (window.syncToCloud) {
        window.syncToCloud();
    } else {
        localStorage.setItem('dropship_active', JSON.stringify(window.activeItems));
        localStorage.setItem('dropship_archived', JSON.stringify(window.archivedItems));
    }
    updateStats();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMsg.textContent = message;
    if (type === 'danger') {
        toastIcon.className = 'fa-solid fa-trash-can text-rose-400 text-lg';
    } else if (type === 'info') {
        toastIcon.className = 'fa-solid fa-circle-info text-blue-400 text-lg';
    } else {
        toastIcon.className = 'fa-solid fa-circle-check text-emerald-400 text-lg';
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Render Tabel Utama (Dropship Online)
window.renderActiveTable = function(filterQuery = '') {
    const tbody = document.getElementById('active-items-tbody');
    const emptyState = document.getElementById('empty-active-state');
    tbody.innerHTML = '';

    const filtered = window.activeItems.filter(item => 
        (item.name || '').toLowerCase().includes(filterQuery.toLowerCase())
    );

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    filtered.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';

        const imageCell = item.image 
            ? `<div class="relative group flex items-center justify-center">
                <img src="${item.image}" alt="Produk" class="w-12 h-12 object-cover rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition-transform" onclick="openImageModal('${item.image}', '${escapeHtml(item.name)}')">
                <button onclick="openUploadModal(${item.id})" class="ml-1 p-1 text-slate-400 hover:text-brand-600" title="Ganti Foto"><i class="fa-solid fa-arrows-rotate text-xs"></i></button>
               </div>`
            : `<button onclick="openUploadModal(${item.id})" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium border border-dashed border-slate-300 inline-flex items-center gap-1">
                <i class="fa-solid fa-camera text-slate-400"></i> + Foto
               </button>`;

        tr.innerHTML = `
            <td class="py-3 px-4 text-center font-medium text-slate-400">${index + 1}</td>
            <td class="py-3 px-4">
                <input type="text" value="${escapeHtml(item.name)}" 
                       onfocus="window.isLocalEditing=true"
                       onblur="window.isLocalEditing=false; updateItemName(${item.id}, this.value)"
                       placeholder="Nama barang..." 
                       class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:bg-white px-2 py-1.5 rounded outline-none font-medium text-slate-800 transition-all">
            </td>
            <td class="py-3 px-4 min-w-[150px]">
                <input type="text" value="${escapeHtml(item.qty)}" 
                       onfocus="window.isLocalEditing=true"
                       onblur="window.isLocalEditing=false; updateItemQty(${item.id}, this.value)"
                       placeholder="Contoh: 1 Psg" 
                       class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:bg-white px-2 py-1.5 rounded outline-none text-slate-700 font-medium transition-all">
            </td>
            <td class="py-3 px-4 text-center">
                ${imageCell}
            </td>
            <td class="py-3 px-4 text-center">
                <button onclick="toggleReady(${item.id})" class="text-xl transition-transform active:scale-95 focus:outline-none">
                    ${item.ready 
                        ? '<i class="fa-solid fa-square-check text-emerald-600 hover:text-emerald-700"></i>' 
                        : '<i class="fa-regular fa-square text-slate-400 hover:text-slate-600"></i>'}
                </button>
            </td>
            <td class="py-3 px-4 text-center">
                <button onclick="archiveItem(${item.id})" 
                        title="Hapus (Pindah Otomatis ke Folder Harian)" 
                        class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold border border-rose-200/60 transition-all inline-flex items-center gap-1">
                    <i class="fa-solid fa-trash-can"></i> Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render Bagian Folder Harian
window.renderArchiveSection = function() {
    const uniqueDates = Array.from(new Set(window.archivedItems.map(item => item.archiveDate))).sort().reverse();
    const todayStr = getTodayDateString();

    if (!uniqueDates.includes(window.selectedFolderDate) && uniqueDates.length > 0) {
        if (!window.selectedFolderDate) window.selectedFolderDate = uniqueDates[0];
    }

    const tabsContainer = document.getElementById('folder-tabs-container');
    tabsContainer.innerHTML = '';

    let datesToDisplay = [...uniqueDates];
    if (!datesToDisplay.includes(todayStr)) {
        datesToDisplay.unshift(todayStr);
    }

    document.getElementById('export-folder-title').innerHTML = `
        <i class="fa-solid fa-folder text-amber-400"></i> Folder (${formatDateFriendly(window.selectedFolderDate || todayStr)})
    `;

    datesToDisplay.forEach((dateStr) => {
        const count = window.archivedItems.filter(i => i.archiveDate === dateStr).length;
        const isSelected = (dateStr === window.selectedFolderDate);

        const btn = document.createElement('button');
        btn.onclick = () => {
            window.selectedFolderDate = dateStr;
            document.getElementById('folder-date-select').value = dateStr;
            window.renderArchiveSection();
        };

        btn.className = `px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
            isSelected 
            ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30' 
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
        }`;

        btn.innerHTML = `
            <i class="fa-solid fa-folder${isSelected ? '-open' : ''}"></i>
            <span>Folder (${formatDateFriendly(dateStr)})</span>
            <span class="${isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'} px-2 py-0.5 rounded-full text-[10px]">${count}</span>
        `;
        tabsContainer.appendChild(btn);
    });

    const tbody = document.getElementById('archived-items-tbody');
    const emptyState = document.getElementById('empty-archive-state');
    tbody.innerHTML = '';

    const itemsInFolder = window.archivedItems.filter(item => item.archiveDate === window.selectedFolderDate);

    if (itemsInFolder.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    itemsInFolder.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';

        tr.innerHTML = `
            <td class="py-3 px-4 text-center font-medium text-slate-400">${index + 1}</td>
            <td class="py-3 px-4 font-semibold text-slate-800">${escapeHtml(item.name || '-')}</td>
            <td class="py-3 px-4 text-slate-700 min-w-[130px] font-medium">${escapeHtml(item.qty || '-')}</td>
            <td class="py-3 px-4">
                <input type="text" value="${escapeHtml(item.courier || '')}" 
                       onfocus="window.isLocalEditing=true"
                       onblur="window.isLocalEditing=false; updateItemCourier(${item.id}, this.value)"
                       placeholder="Ekspedisi (J&T, SPX...)" 
                       class="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:bg-white px-2.5 py-1 rounded-lg outline-none text-xs text-slate-700 transition-all">
            </td>
            <td class="py-3 px-4">
                <input type="text" value="${escapeHtml(item.account || '')}" 
                       onfocus="window.isLocalEditing=true"
                       onblur="window.isLocalEditing=false; updateItemAccount(${item.id}, this.value)"
                       placeholder="Akun (Shopee, TikTok...)" 
                       class="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:bg-white px-2.5 py-1 rounded-lg outline-none text-xs text-slate-700 transition-all">
            </td>
            <td class="py-3 px-4 text-center">
                <button onclick="setArchiveStatus(${item.id}, 'dikirim')" class="text-xl transition-all">
                    ${item.status === 'dikirim' 
                        ? '<i class="fa-solid fa-square-check text-emerald-600"></i>' 
                        : '<i class="fa-regular fa-square text-slate-300 hover:text-slate-500"></i>'}
                </button>
            </td>
            <td class="py-3 px-4 text-center">
                <button onclick="setArchiveStatus(${item.id}, 'cancel')" class="text-xl transition-all">
                    ${item.status === 'cancel' 
                        ? '<i class="fa-solid fa-square-check text-rose-500"></i>' 
                        : '<i class="fa-regular fa-square text-slate-300 hover:text-slate-500"></i>'}
                </button>
            </td>
            <td class="py-3 px-4 text-center data-export-ignore">
                <button onclick="deleteArchivedItemPermanently(${item.id})" 
                        title="Hapus Permanen dari Folder" 
                        class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold border border-rose-200/60 transition-all inline-flex items-center justify-center">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateStats = function() {
    const readyCount = window.activeItems.filter(i => i.ready).length;
    const shippedCount = window.archivedItems.filter(i => i.status === 'dikirim').length;
    const cancelCount = window.archivedItems.filter(i => i.status === 'cancel').length;

    document.getElementById('stat-ready-count').textContent = readyCount;
    document.getElementById('stat-shipped-count').textContent = shippedCount;
    document.getElementById('stat-cancel-count').textContent = cancelCount;
}

// TAMBAH BARIS KOSONG
function addNewRow() {
    const newItem = {
        id: Date.now(),
        name: '', 
        qty: '',  
        image: '', 
        ready: false
    };
    window.activeItems.push(newItem);
    triggerCloudSync();
    window.renderActiveTable(document.getElementById('search-input').value);
    showToast('Baris kosong ditambahkan');
}

function updateItemName(id, value) {
    const item = window.activeItems.find(i => i.id === id);
    if (item) {
        item.name = value;
        triggerCloudSync();
    }
}

function updateItemQty(id, value) {
    const item = window.activeItems.find(i => i.id === id);
    if (item) {
        item.qty = value;
        triggerCloudSync();
    }
}

function updateItemCourier(id, value) {
    const item = window.archivedItems.find(i => i.id === id);
    if (item) {
        item.courier = value;
        triggerCloudSync();
    }
}

function updateItemAccount(id, value) {
    const item = window.archivedItems.find(i => i.id === id);
    if (item) {
        item.account = value;
        triggerCloudSync();
    }
}

function deleteArchivedItemPermanently(id) {
    const index = window.archivedItems.findIndex(i => i.id === id);
    if (index !== -1) {
        window.archivedItems.splice(index, 1);
        triggerCloudSync();
        window.renderArchiveSection();
        showToast('Catatan folder dihapus permanen', 'danger');
    }
}

function toggleReady(id) {
    const item = window.activeItems.find(i => i.id === id);
    if (item) {
        item.ready = !item.ready;
        triggerCloudSync();
        window.renderActiveTable(document.getElementById('search-input').value);
    }
}

// Hapus & Otomatis Pindah ke Folder Harian
function archiveItem(id) {
    const index = window.activeItems.findIndex(i => i.id === id);
    if (index !== -1) {
        const item = window.activeItems[index];
        const archiveDate = getTodayDateString();

        const archivedEntry = {
            ...item,
            courier: '',
            account: '',
            status: 'dikirim',
            archiveDate: archiveDate,
            archivedAt: new Date().toISOString()
        };

        window.activeItems.splice(index, 1);
        window.archivedItems.unshift(archivedEntry);

        window.selectedFolderDate = archiveDate;
        document.getElementById('folder-date-select').value = archiveDate;

        triggerCloudSync();
        window.renderActiveTable(document.getElementById('search-input').value);
        window.renderArchiveSection();
        showToast(`Item dipindahkan ke Folder (${formatDateFriendly(archiveDate)})`, 'danger');
    }
}

function setArchiveStatus(id, newStatus) {
    const item = window.archivedItems.find(i => i.id === id);
    if (item) {
        item.status = newStatus;
        triggerCloudSync();
        window.renderArchiveSection();
    }
}

// Modal Upload Gambar per Baris
function openUploadModal(id) {
    activeRowForUpload = id;
    const item = window.activeItems.find(i => i.id === id);
    const btnDelete = document.getElementById('btn-delete-row-img');
    
    if (item && item.image) {
        btnDelete.classList.remove('hidden');
    } else {
        btnDelete.classList.add('hidden');
    }
    
    document.getElementById('upload-modal').classList.remove('hidden');
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    activeRowForUpload = null;
}

function handleRowImageUpload(event) {
    const file = event.target.files[0];
    if (file && activeRowForUpload) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxW = 500;
                const maxH = 500;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxW) {
                        height *= maxW / width;
                        width = maxW;
                    }
                } else {
                    if (height > maxH) {
                        width *= maxH / height;
                        height = maxH;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                const resizedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                const item = window.activeItems.find(i => i.id === activeRowForUpload);
                if (item) {
                    item.image = resizedBase64;
                    triggerCloudSync();
                    window.renderActiveTable(document.getElementById('search-input').value);
                    showToast('Foto produk berhasil disimpan');
                }
                closeUploadModal();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function removeRowImage() {
    if (activeRowForUpload) {
        const item = window.activeItems.find(i => i.id === activeRowForUpload);
        if (item) {
            item.image = '';
            triggerCloudSync();
            window.renderActiveTable(document.getElementById('search-input').value);
            showToast('Foto produk dihapus', 'info');
        }
        closeUploadModal();
    }
}

function openImageModal(imgSrc, title) {
    document.getElementById('modal-img').src = imgSrc;
    document.getElementById('modal-title').textContent = title || 'Gambar Produk';
    document.getElementById('image-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('image-modal').classList.add('hidden');
}

// SIMPAN KE GALERI (DOWNLOAD GAMBAR TABEL FOLDER)
function downloadFolderAsImage() {
    const exportArea = document.getElementById('folder-export-area');
    
    const ignoreElements = exportArea.querySelectorAll('.data-export-ignore');
    ignoreElements.forEach(el => el.style.display = 'none');

    showToast('Menyiapkan gambar...', 'info');

    html2canvas(exportArea, {
        scale: 2,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        ignoreElements.forEach(el => el.style.display = '');

        const dateTag = window.selectedFolderDate || getTodayDateString();
        const link = document.createElement('a');
        link.download = `Folder-Dropship-${dateTag}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        showToast('Gambar berhasil diunduh ke Galeri!');
    }).catch(err => {
        ignoreElements.forEach(el => el.style.display = '');
        console.error(err);
        showToast('Gagal mengunduh gambar', 'danger');
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

window.onload = function() {
    loadInitialData();

    const today = getTodayDateString();
    document.getElementById('folder-date-select').value = window.selectedFolderDate || today;

    window.renderActiveTable();
    window.renderArchiveSection();
    window.updateStats();

    document.getElementById('search-input').addEventListener('input', (e) => {
        window.renderActiveTable(e.target.value);
    });

    document.getElementById('folder-date-select').addEventListener('change', (e) => {
        window.selectedFolderDate = e.target.value;
        window.renderArchiveSection();
    });
};