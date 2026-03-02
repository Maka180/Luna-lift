
// 1. NAVIGATION & STATE
const currentUser = localStorage.getItem('lunaUser') || 'guest';
const KEY_ROUTINES = `lunaSavedRoutines_${currentUser}`;
const KEY_DIARY = `lunaDiary_${currentUser}`;
const KEY_CUSTOM = `lunaCustomExercises_${currentUser}`;

const apiKey = '5a47c0c1d0msh3eb2471aa7370c8p196d3ejsn2bf2b5bf028a'; 
let allExercises = [], filteredExercises = [], activeRoutine = [];

// PERSISTENT VIEW STATE
let currentIndex = 10; 
const step = 10;

let currentWorkout = null, currentStep = 0, sessionSeconds = 0, sessionInterval = null;
let pendingExercise = null;

function goBack() { window.location.href = 'index.html'; }

// 2. TAB TOGGLE
function toggleView(view) {
    const views = ['view-all', 'view-custom', 'view-saved', 'view-diary'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.style.display = (v === `view-${view}`) ? 'block' : 'none';
    });
    
    const sidebar = document.getElementById('main-sidebar');
    if (sidebar) sidebar.style.display = (view === 'all') ? 'flex' : 'none';

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${view}`);
    if (activeTab) activeTab.classList.add('active');

    if (view === 'saved') displaySavedRoutines();
    if (view === 'diary') displayDiary();
}

// 3. API & RENDER
/*async function getExercises() {
    const options = { 
        method: 'GET', 
        headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com' } 
    };
    try {
        // Requesting limit=100 ensures we get the full glute library from the API
        const res = await fetch('https://exercisedb.p.rapidapi.com/exercises/target/glutes?limit=100', options);
        const results = await res.json();
        const custom = JSON.parse(localStorage.getItem(KEY_CUSTOM)) || [];
        
        allExercises = [...custom, ...results];
        filteredExercises = [...allExercises];
        
        renderBatch(true);
    } catch (e) { 
        console.error("API Error:", e); 
    }
}*/
async function getExercises() {
    try {
        const muscles = ['glutes', 'hamstrings', 'quadriceps', 'calves'];
        const custom = JSON.parse(localStorage.getItem(KEY_CUSTOM)) || [];
        let results = [];

        for (const muscle of muscles) {
            const res = await fetch(`https://api.api-ninjas.com/v1/exercises?muscle=${muscle}&limit=20`, {
                headers: { 'X-Api-Key': '5OSwks4t27SenbpSZvVKMFfOK92om3GXbDFoKRlK' }
            });
            const data = await res.json();
            results = [...results, ...data];
        }

        // Remove duplicates by name
        const seen = new Set();
        results = results.filter(ex => {
            if (seen.has(ex.name)) return false;
            seen.add(ex.name);
            return true;
        });

        allExercises = [...custom, ...results.map((ex, i) => ({
    id: 'api-' + i,
    name: ex.name,
    equipment: ex.type,
    difficulty: ex.difficulty,
    instructions: ex.instructions,  // 👈 add this line
    gifUrl: null
}))];

        filteredExercises = [...allExercises];
        renderBatch(true);
    } catch (e) {
        console.error("API Error:", e);
    }
}

function renderBatch(isNewSearch = false) {
    const container = document.getElementById('exercise-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loadLessBtn = document.getElementById('load-less-btn');
    const counterLabel = document.getElementById('exercise-counter');
    
    if (!container) return;

    if (isNewSearch) { 
        currentIndex = 10; 
    }

    container.innerHTML = ''; 
    const currentView = filteredExercises.slice(0, currentIndex);
    
    currentView.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'exercise-card';
        
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(ex.gifUrl || '')}`;

div.innerHTML = `
    <h4>${ex.name.toUpperCase()}</h4>
    <div style="min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8f4f0, #fce4ec); border-radius: 12px; margin: 10px 0; padding: 15px;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">🍑</div>
        <div style="font-size: 0.75rem; color: #8A9A5B; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            ${ex.equipment || 'Bodyweight'}
        </div>
        <div style="font-size: 0.7rem; color: #bbb; margin-top: 4px; text-transform: capitalize;">
            ${ex.difficulty || ''}
        </div>
    </div>
    ${ex.instructions ? `
    <details style="margin: 8px 0; font-size: 0.78rem; color: #666; cursor: pointer;">
        <summary style="color: #8A9A5B; font-weight: bold; cursor: pointer; list-style: none; text-align: center;">
            📋 How to do it
        </summary>
        <p style="margin-top: 8px; line-height: 1.5; padding: 0 5px;">${ex.instructions}</p>
    </details>` : ''}
    <button class="btn-add" onclick="openRoutineModal('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')">+ Add to Routine</button>
`;

        container.appendChild(div);
    });

    if (counterLabel) {
        counterLabel.innerText = filteredExercises.length > 0 
            ? `Showing ${currentView.length} of ${filteredExercises.length} glute exercises`
            : "No exercises found.";
    }

    if (loadMoreBtn) {
        if (currentIndex < filteredExercises.length) {
            loadMoreBtn.style.display = 'inline-block';
            loadMoreBtn.onclick = () => {
                currentIndex += step; 
                renderBatch(false); 
            };
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    if (loadLessBtn) {
        if (currentIndex > 10) {
            loadLessBtn.style.display = 'inline-block';
            loadLessBtn.onclick = () => {
                currentIndex = Math.max(10, currentIndex - step);
                renderBatch(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        } else {
            loadLessBtn.style.display = 'none';
        }
    }
}

// 4. MODAL LOGIC
function openRoutineModal(id, name) {
    pendingExercise = { id, name };
    const modal = document.getElementById('routine-modal'), choices = document.getElementById('modal-choices');
    const saved = JSON.parse(localStorage.getItem(KEY_ROUTINES)) || [];
    
    choices.innerHTML = `<button class="btn-add" style="margin:0;" onclick="confirmAddToActive()">Current Builder Sidebar</button>`;
    
    saved.forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'btn-add'; 
        btn.style.cssText = "margin:0; background:var(--sage); color:white;";
        btn.innerText = `Add to: ${r.name}`;
        btn.onclick = () => injectIntoExisting(r.id);
        choices.appendChild(btn);
    });
    modal.style.display = 'flex';
}

function closeRoutineModal() { 
    document.getElementById('routine-modal').style.display = 'none'; 
    pendingExercise = null; 
}

function confirmAddToActive() {
    if (!activeRoutine.find(i => i.id === pendingExercise.id)) { 
        activeRoutine.push(pendingExercise); 
        updateRoutineUI(); 
    }
    closeRoutineModal();
}

function injectIntoExisting(routineId) {
    let saved = JSON.parse(localStorage.getItem(KEY_ROUTINES)) || [];
    let rIdx = saved.findIndex(r => r.id === routineId);
    if (rIdx !== -1 && !saved[rIdx].exercises.find(ex => ex.id === pendingExercise.id)) {
        saved[rIdx].exercises.push(pendingExercise);
        localStorage.setItem(KEY_ROUTINES, JSON.stringify(saved));
    }
    closeRoutineModal();
}

// 5. BUILDER & SAVED VIEW
function updateRoutineUI() {
    const list = document.getElementById('routine-list');
    const countLabel = document.getElementById('item-count');
    if (countLabel) countLabel.innerText = `${activeRoutine.length} added`;
    
    if (activeRoutine.length === 0) {
        list.innerHTML = `<p style="text-align: center; color: #ccc; margin-top: 50px;">Add moves to build a routine.</p>`;
    } else {
        list.innerHTML = activeRoutine.map((item, i) => `
            <li>
                ${item.name.toUpperCase()} 
                <button onclick="removeFromRoutine(${i})" style="color:red; border:none; background:none; cursor:pointer;">✕</button>
            </li>
        `).join('');
    }
}

function removeFromRoutine(i) { activeRoutine.splice(i, 1); updateRoutineUI(); }

function saveRoutineWithMusic() {
    const name = document.getElementById('routine-name').value;
    const link = document.getElementById('playlist-link').value;

    if (!name || activeRoutine.length === 0) {
        alert("Please add moves and a routine name! ✨");
        return;
    }

    const saved = JSON.parse(localStorage.getItem(KEY_ROUTINES)) || [];
    const finalRoutine = {
        id: Date.now(),
        name: name,
        music: link,
        exercises: [...activeRoutine],
        lastStats: null
    };

    saved.push(finalRoutine);
    localStorage.setItem(KEY_ROUTINES, JSON.stringify(saved));

    alert("Routine Saved! 💪");
    activeRoutine = []; 
    document.getElementById('routine-name').value = '';
    document.getElementById('playlist-link').value = '';
    updateRoutineUI();
    displaySavedRoutines();
    toggleView('saved');
}

function displaySavedRoutines() {
    const gallery = document.getElementById('routines-gallery');
    const saved = JSON.parse(localStorage.getItem(KEY_ROUTINES)) || [];
    if (saved.length === 0) { 
        gallery.innerHTML = '<p style="text-align:center; color:#ccc; grid-column: 1/-1;">No saved workouts yet.</p>'; 
        return; 
    }

    gallery.innerHTML = saved.map(r => {
        const musicBtn = r.music ? `<button onclick="event.stopPropagation(); window.open('${r.music}', '_blank')" style="background:#FADADD; border:none; border-radius:10px; padding:5px 10px; font-size:0.7rem; cursor:pointer; margin-right:5px; color:#8A9A5B; font-weight:bold;">🎵 Play Music</button>` : '';

        let historyHTML = `<div style="font-size:0.7rem; color:#ccc; margin-top:10px;">No history yet</div>`;

        if (r.lastStats) {
            const breakdown = r.lastStats.exerciseBreakdown || [];
            const exerciseRows = breakdown.map(ex => `
                <div style="margin-top: 6px; text-align: left; background: #fafafa; border-radius: 8px; padding: 6px 8px; border: 1px solid #eee;">
                    <div style="font-weight: bold; color: #8A9A5B; font-size: 0.7rem; margin-bottom: 3px;">${ex.name.toUpperCase()}</div>
                    ${ex.sets.map((s, i) => `
                        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: #666; padding: 2px 0; border-bottom: 1px dashed #eee;">
                            <span>Set ${i + 1}</span>
                            <span>${s.reps} reps</span>
                            <span>${s.weight > 0 ? s.weight + ' kg' : 'Bodyweight'}</span>
                        </div>
                    `).join('')}
                    <div style="text-align: right; font-size: 0.68rem; color: #8A9A5B; font-weight: bold; margin-top: 3px;">
                        ${ex.totalVolume > 0 ? '🏋️ ' + ex.totalVolume + ' kg' : '🏋️ Bodyweight'}
                    </div>
                </div>
            `).join('');

            historyHTML = `
                <div style="margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 8px;">
                    <div style="font-size: 0.7rem; color: #888; margin-bottom: 6px;">
                        📅 ${r.lastStats.date} &nbsp;|&nbsp; ⏱️ ${r.lastStats.time} &nbsp;|&nbsp; 💪 ${r.lastStats.totalReps} reps
                    </div>
                    ${exerciseRows}
                    <div style="margin-top: 8px; text-align: right; font-size: 0.75rem; font-weight: bold; color: #8A9A5B; border-top: 1px solid #eee; padding-top: 5px;">
                        🏋️ Total: ${r.lastStats.totalVolume > 0 ? r.lastStats.totalVolume + ' kg lifted' : 'Bodyweight session'}
                    </div>
                </div>
            `;
        }

        return `
            <div class="exercise-card" onclick="startWorkout(${r.id})" style="cursor:pointer;">
                <h4 style="color:var(--sage); margin:0;">${r.name.toUpperCase()}</h4>
                <p style="margin:5px 0; font-size:0.8rem;">${r.exercises.length} Exercises</p>
                ${historyHTML}
                <div style="margin-top:10px;" onclick="event.stopPropagation()">
                    ${musicBtn}
                    <button onclick="deleteRoutine(${r.id})" style="color:#ff6b6b; border:none; background:none; font-size:0.7rem; cursor:pointer;">Delete</button>
                </div>
            </div>`;
    }).join('');
}

function deleteRoutine(id) { 
    if(confirm("Delete this routine?")) { 
        let s = (JSON.parse(localStorage.getItem(KEY_ROUTINES)) || []).filter(r => r.id !== id); 
        localStorage.setItem(KEY_ROUTINES, JSON.stringify(s)); 
        displaySavedRoutines(); 
    } 
}

// 6. WORKOUT PLAYER
function startWorkout(id) {
    const saved = JSON.parse(localStorage.getItem(KEY_ROUTINES));
    currentWorkout = saved.find(r => r.id === id);
    document.getElementById('workout-player').style.display = 'block';
    document.getElementById('ready-screen').style.display = 'block';
    document.getElementById('active-tracker').style.display = 'none';
    document.getElementById('ready-name').innerText = currentWorkout.name;
    document.getElementById('ready-info').innerText = `${currentWorkout.exercises.length} Exercises`;
}

let sessionSets = {};

function beginTracking() {
    document.getElementById('ready-screen').style.display = 'none';
    document.getElementById('active-tracker').style.display = 'block';
    currentStep = 0; sessionSeconds = 0; sessionSets = {};
    updatePlayerUI();
    sessionInterval = setInterval(() => {
        sessionSeconds++;
        const m = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
        const s = (sessionSeconds % 60).toString().padStart(2, '0');
        document.getElementById('player-timer').innerText = `${m}:${s}`;
    }, 1000);
}

function updatePlayerUI() {
    const ex = currentWorkout.exercises[currentStep];
    document.getElementById('player-ex-name').innerText = ex.name.toUpperCase();
    const exData = allExercises.find(i => i.id === ex.id) || {};
    document.getElementById('player-gif').src = exData.gifUrl || '';
    document.getElementById('player-progress').innerText = `${currentStep + 1} / ${currentWorkout.exercises.length}`;
    document.getElementById('input-reps').value = 10;
    document.getElementById('input-weight').value = 0;

    // Init storage for this exercise if not yet
    if (!sessionSets[ex.id]) {
        sessionSets[ex.id] = { name: ex.name, sets: [] };
    }
    renderSetsLog(ex.id);
}

function nextStep() {
    if (currentStep < currentWorkout.exercises.length - 1) {
        currentStep++; updatePlayerUI();
    } else {
        logFinalStats();
        alert("Workout Complete! Stats saved.");
        closeWorkout(true);
    }
}
function logSet() {
    const ex = currentWorkout.exercises[currentStep];
    const reps = parseInt(document.getElementById('input-reps').value) || 0;
    const weight = parseFloat(document.getElementById('input-weight').value) || 0;
    if (reps === 0) return alert("Please enter at least 1 rep!");

    if (!sessionSets[ex.id]) sessionSets[ex.id] = { name: ex.name, sets: [] };
    sessionSets[ex.id].sets.push({ reps, weight });
    renderSetsLog(ex.id);
}
function renderSetsLog(exId) {
    const log = document.getElementById('sets-log');
    const data = sessionSets[exId];
    if (!data || data.sets.length === 0) { log.innerHTML = ''; return; }

    let exTotal = 0;
    data.sets.forEach(s => exTotal += s.reps * s.weight);

    log.innerHTML = `
        ${data.sets.map((s, i) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-radius: 8px; margin-top: 5px; font-size: 0.8rem; border: 1px solid #eee;">
                <span style="color: #8A9A5B; font-weight: bold;">Set ${i + 1}</span>
                <span>${s.reps} reps</span>
                <span>${s.weight > 0 ? s.weight + ' kg' : 'Bodyweight'}</span>
                <button onclick="deleteSet('${exId}', ${i})" style="color: #ff6b6b; border: none; background: none; cursor: pointer;">✕</button>
            </div>
        `).join('')}
         <div style="text-align: right; font-size: 0.75rem; color: #8A9A5B; font-weight: bold; margin-top: 6px; padding-right: 5px;">
            Exercise volume: ${exTotal > 0 ? exTotal + ' kg' : 'Bodyweight only'}
        </div>
    `;
}
function deleteSet(exId, index) {
    if (sessionSets[exId]) {
        sessionSets[exId].sets.splice(index, 1);
        renderSetsLog(exId);
    }
}
function logFinalStats() {
    let saved = JSON.parse(localStorage.getItem(KEY_ROUTINES)) || [];
    let idx = saved.findIndex(r => r.id === currentWorkout.id);
    if (idx !== -1) {
        let totalVolume = 0;
        let totalReps = 0;

        const exerciseBreakdown = Object.values(sessionSets).map(ex => {
            let exVolume = 0;
            let exReps = 0;
            ex.sets.forEach(s => {
                exReps += s.reps;
                exVolume += s.reps * s.weight;
            });
            totalReps += exReps;
            totalVolume += exVolume;
            return {
                 name: ex.name,
                sets: ex.sets,
                totalReps: exReps,
                totalVolume: exVolume
            };
        });

        saved[idx].lastStats = {
            date: new Date().toLocaleDateString(),
            time: document.getElementById('player-timer').innerText,
            totalReps,
            totalVolume: totalVolume.toFixed(1),
            exerciseBreakdown
        };
        localStorage.setItem(KEY_ROUTINES, JSON.stringify(saved));
    }
}



function closeWorkout(skip = false) {
    if (skip || confirm("End Session?")) {
        document.getElementById('workout-player').style.display = 'none';
        clearInterval(sessionInterval);
        document.getElementById('player-timer').innerText = "00:00";
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        updatePlayerUI();
    }
}

// 7. DIARY LOGIC
async function saveDiaryEntry() {
    const month = document.getElementById('diary-month').value;
    const photoFile = document.getElementById('diary-photo').files[0];
    if (!month) return alert("Select a month!");

    let imageData = "";
    if (photoFile) imageData = await toBase64(photoFile);

    const entry = { id: Date.now(), month, weight: document.getElementById('diary-weight').value, notes: document.getElementById('diary-notes').value, image: imageData };
    const diary = JSON.parse(localStorage.getItem(KEY_DIARY)) || [];
    diary.push(entry);
    diary.sort((a,b) => new Date(b.month) - new Date(a.month));
    localStorage.setItem(KEY_DIARY, JSON.stringify(diary));
    
    document.getElementById('diary-weight').value = '';
    document.getElementById('diary-notes').value = '';
    document.getElementById('diary-photo').value = '';
    displayDiary();
}

function displayDiary() {
    const gallery = document.getElementById('diary-gallery');
    const diary = JSON.parse(localStorage.getItem(KEY_DIARY)) || [];
    gallery.innerHTML = diary.map(e => `
        <div class="exercise-card">
            <h4 style="color:var(--sage);">${new Date(e.month + "-02").toLocaleDateString(undefined, {month:'long', year:'numeric'})}</h4>
            ${e.image ? `<img src="${e.image}">` : '<div style="height:100px; background:#eee; margin:10px 0; border-radius:10px;"></div>'}
            <p><strong>${e.weight || '--'}</strong></p>
            <p style="font-size:0.8rem; color:#666;">${e.notes}</p>
            <button onclick="deleteDiaryEntry(${e.id})" style="color:red; border:none; background:none; font-size:0.7rem; cursor:pointer;">Delete</button>
        </div>
    `).join('');
}

function deleteDiaryEntry(id) { 
    if(confirm("Delete entry?")) { 
        let d = (JSON.parse(localStorage.getItem(KEY_DIARY)) || []).filter(e => e.id !== id); 
        localStorage.setItem(KEY_DIARY, JSON.stringify(d)); 
        displayDiary(); 
    } 
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = e => reject(e);
});

// 8. INITIALIZATION
window.onload = () => {
    getExercises();

    const searchInput = document.getElementById('exercise-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            filteredExercises = allExercises.filter(ex => 
                ex.name.toLowerCase().includes(term)
            );
            renderBatch(true); 
        };
    }

    if (document.getElementById('save-diary-btn')) {
        document.getElementById('save-diary-btn').onclick = saveDiaryEntry;
    }

    const customBtn = document.getElementById('add-custom-btn');
    if (customBtn) {
        customBtn.onclick = () => {
            const n = document.getElementById('custom-name').value; 
            if(!n) return alert("Enter a name!");
            const newEx = { 
                id: 'custom-'+Date.now(), 
                name: n, 
                equipment: document.getElementById('custom-equipment').value, 
                gifUrl: document.getElementById('custom-gif').value 
            };
            const c = JSON.parse(localStorage.getItem(KEY_CUSTOM)) || [];
            c.push(newEx); 
            localStorage.setItem(KEY_CUSTOM, JSON.stringify(c));
            allExercises.unshift(newEx); 
            filteredExercises = [...allExercises]; 
            renderBatch(true); 
            toggleView('all');
        };
    }
    
    const clearBtn = document.getElementById('clear-builder-btn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if(confirm("Clear current routine?")) {
                activeRoutine = [];
                updateRoutineUI();
            }
        };
    }
};