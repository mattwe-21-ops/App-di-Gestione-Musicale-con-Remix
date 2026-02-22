/**
 * DJ Remix Organizer - Logica di Funzionamento
 * Gestisce la memorizzazione locale, l'interfaccia e i file multimediali.
 */

// Stato globale dell'applicazione
let appState = {
    songs: JSON.parse(localStorage.getItem('dj_pro_songs')) || [],
    links: JSON.parse(localStorage.getItem('dj_pro_links')) || []
};

// Mappa per gestire i file caricati nella sessione corrente
// Nota: I file caricati tramite <input type="file"> non persistono al refresh 
// senza un server, quindi usiamo URL.createObjectURL per la sessione.
const sessionMedia = new Map();

// --- INIZIALIZZAZIONE ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    renderSongs();
    updateSelectors();
    
    // Inizializza pulsanti di backup
    document.getElementById('exportBtn').onclick = exportData;
    document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
    document.getElementById('importFile').onchange = importData;

    // Ricerca in tempo reale
    document.getElementById('searchInput').oninput = (e) => renderSongs(e.target.value);
});

// --- NAVIGAZIONE ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabs = document.querySelectorAll('.tab-content');
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');

    navItems.forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.dataset.tab;
            
            // UI Update
            navItems.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabs.forEach(t => t.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
        };
    });

    toggle.onclick = () => sidebar.classList.toggle('collapsed');
}

// --- GESTIONE BRANI ---
const songForm = document.getElementById('songForm');
const mediaInput = document.getElementById('mediaFile');
const fileLabel = document.getElementById('fileLabel');

// Feedback caricamento file
mediaInput.onchange = (e) => {
    if (e.target.files[0]) {
        fileLabel.innerText = `File pronto: ${e.target.files[0].name}`;
        fileLabel.style.color = 'var(--accent)';
    }
};

songForm.onsubmit = (e) => {
    e.preventDefault();

    const file = mediaInput.files[0];
    let mediaUrl = null;
    let fileType = null;

    if (file) {
        mediaUrl = URL.createObjectURL(file);
        fileType = file.type.startsWith('video') ? 'video' : 'audio';
    }

    const newSong = {
        id: Date.now().toString(),
        title: document.getElementById('songTitle').value,
        artist: document.getElementById('artist').value,
        bpm: document.getElementById('bpm').value || '?',
        key: document.getElementById('key').value || '-',
        mediaUrl: mediaUrl,
        fileType: fileType,
        dateAdded: new Date().toLocaleDateString()
    };

    appState.songs.push(newSong);
    saveState();
    renderSongs();
    updateSelectors();
    songForm.reset();
    fileLabel.innerText = "Trascina qui o clicca per caricare";
    fileLabel.style.color = "var(--text-dim)";
    
    showToast("Brano aggiunto alla libreria!");
    // Torna alla libreria
    document.querySelector('[data-tab="songs"]').click();
};

function renderSongs(query = '') {
    const list = document.getElementById('songsList');
    const countBadge = document.getElementById('songCount');
    list.innerHTML = '';

    const filtered = appState.songs.filter(s => 
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.artist.toLowerCase().includes(query.toLowerCase()) ||
        s.bpm.toString().includes(query)
    );

    countBadge.innerText = `${filtered.length} Brani`;

    filtered.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.innerHTML = `
            <button class="delete-btn" onclick="deleteSong('${song.id}')">🗑</button>
            <div class="song-info">
                <h3>${song.title}</h3>
                <p>${song.artist}</p>
                <div>
                    <span class="bpm-tag">${song.bpm} BPM</span>
                    <span class="badge" style="margin-left:5px">${song.key}</span>
                </div>
            </div>
            ${song.mediaUrl ? `
                <div class="media-player">
                    ${song.fileType === 'video' 
                        ? `<video src="${song.mediaUrl}" controls></video>` 
                        : `<audio src="${song.mediaUrl}" controls></audio>`
                    }
                </div>
            ` : '<p style="font-size: 0.7rem; color: #475569; margin-top:10px">Nessun file collegato</p>'}
        `;
        list.appendChild(card);
    });
}

function deleteSong(id) {
    if (confirm("Vuoi davvero eliminare questo brano?")) {
        appState.songs = appState.songs.filter(s => s.id !== id);
        saveState();
        renderSongs();
        updateSelectors();
        showToast("Brano rimosso.");
    }
}

// --- GESTIONE REMIX (CONNESSIONI) ---
const linkForm = document.getElementById('linkForm');

function updateSelectors() {
    const sourceSel = document.getElementById('sourceSong');
    const linkedSel = document.getElementById('linkedSong');
    
    const options = appState.songs.map(s => `<option value="${s.id}">${s.artist} - ${s.title} (${s.bpm} BPM)</option>`).join('');
    
    sourceSel.innerHTML = '<option value="">Seleziona...</option>' + options;
    linkedSel.innerHTML = '<option value="">Seleziona...</option>' + options;
}

linkForm.onsubmit = (e) => {
    e.preventDefault();
    const sourceId = document.getElementById('sourceSong').value;
    const linkedId = document.getElementById('linkedSong').value;
    
    if (sourceId === linkedId) {
        alert("Non puoi collegare una canzone a se stessa!");
        return;
    }

    const newLink = {
        id: Date.now(),
        source: sourceId,
        target: linkedId,
        notes: document.getElementById('remixNotes').value
    };

    appState.links.push(newLink);
    saveState();
    linkForm.reset();
    showToast("Collegamento salvato!");
};

// --- PERSISTENZA E BACKUP ---
function saveState() {
    // Salviamo solo i metadati (i Blob URL non funzionano dopo il refresh)
    localStorage.setItem('dj_pro_songs', JSON.stringify(appState.songs));
    localStorage.setItem('dj_pro_links', JSON.stringify(appState.links));
}

function exportData() {
    const dataStr = JSON.stringify(appState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'dj_organizer_backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (imported.songs && imported.links) {
                appState = imported;
                saveState();
                renderSongs();
                updateSelectors();
                showToast("Backup caricato con successo!");
            }
        } catch (err) {
            alert("Errore nel formato del file di backup.");
        }
    };
    reader.readAsText(file);
}

// --- UTILITY ---
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}