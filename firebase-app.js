import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'dropship-online-shared-store';
let db = null;
let auth = null;
let currentUser = null;

// Inisialisasi Firebase & Snapshot Listener
try {
    if (typeof __firebase_config !== 'undefined') {
        const firebaseConfig = JSON.parse(__firebase_config);
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        const initAuth = async () => {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        };

        initAuth().catch(err => console.log('Auth error:', err));

        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                updateStatusBadge(true, "Terhubung Live");
                listenToFirestore();
            }
        });
    } else {
        updateStatusBadge(false, "Lokal Browser");
    }
} catch(e) {
    console.log("Firebase fallback lokal aktif", e);
    updateStatusBadge(false, "Lokal Browser");
}

// Listener Real-Time Firestore (Saling Terhubung antar HP/PC)
function listenToFirestore() {
    if (!db || !currentUser) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'dropship_data', 'main_store');
    
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Jangan overwrite jika pengguna sedang mengetik
            if (!window.isLocalEditing) {
                if (Array.isArray(data.activeItems)) {
                    window.activeItems = data.activeItems;
                }
                if (Array.isArray(data.archivedItems)) {
                    window.archivedItems = data.archivedItems;
                }
                window.renderActiveTable(document.getElementById('search-input')?.value || '');
                window.renderArchiveSection();
                window.updateStats();
            }
        }
    }, (error) => {
        console.error("Firestore listener warning:", error);
        updateStatusBadge(false, "Offline / Reconnecting");
    });
}

// Function Kirim Data Realtime ke Server
window.syncToCloud = async function() {
    // Selalu simpan ke LocalStorage sebagai cadangan cepat
    localStorage.setItem('dropship_active', JSON.stringify(window.activeItems));
    localStorage.setItem('dropship_archived', JSON.stringify(window.archivedItems));

    if (!db || !currentUser) return;

    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'dropship_data', 'main_store');
        await setDoc(docRef, {
            activeItems: window.activeItems,
            archivedItems: window.archivedItems,
            lastUpdatedBy: window.userName || 'User',
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch(e) {
        console.error("Firestore update error:", e);
    }
};

function updateStatusBadge(isOnline, text) {
    const badge = document.getElementById('connection-status-badge');
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = text;
    
    if (isOnline) {
        badge.className = "px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2";
    } else {
        badge.className = "px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2";
    }
}