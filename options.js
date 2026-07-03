let gestures = {};
let editingGestureKey = null;
let currentRecordedPath = [];

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const addBtn = document.getElementById('add-btn');
const gesturesList = document.getElementById('gestures-list');
const emptyState = document.getElementById('empty-state');
const editorModal = document.getElementById('editor-modal');
const modalTitle = document.getElementById('modal-title');
const gestureRecorder = document.getElementById('gesture-recorder');
const recordedGestureDisplay = document.getElementById('recorded-gesture-display');
const actionSelect = document.getElementById('action-select');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

const directionMap = {
  'U': '↑',
  'D': '↓',
  'L': '←',
  'R': '→'
};

function formatGesture(gestureStr) {
  return gestureStr.split('-').map(dir => directionMap[dir] || dir).join(' ');
}

function loadGestures() {
  chrome.storage.local.get({ gestures: {} }, (data) => {
    gestures = data.gestures;
    renderList();
  });
}

function renderList() {
  const items = gesturesList.querySelectorAll('.gesture-item');
  items.forEach(item => item.remove());

  const keys = Object.keys(gestures);
  if (keys.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  keys.forEach(key => {
    const action = gestures[key];
    const item = document.createElement('div');
    item.className = 'gesture-item';
    
    item.innerHTML = `
      <div class="gesture-info">
        <span class="gesture-arrows">${formatGesture(key)}</span>
        <span class="gesture-action">${action}</span>
      </div>
      <div class="gesture-actions">
        <button class="edit-btn" title="Edit" data-key="${key}">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
        </button>
        <button class="delete-btn" title="Delete" data-key="${key}">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
        </button>
      </div>
    `;

    item.querySelector('.edit-btn').addEventListener('click', () => openEditor(key));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteGesture(key));

    gesturesList.appendChild(item);
  });
}

function openEditor(key = null) {
  editingGestureKey = key;
  currentRecordedPath = [];
  
  if (key) {
    modalTitle.textContent = 'Edit Action';
    currentRecordedPath = key.split('-');
    recordedGestureDisplay.textContent = formatGesture(key);
    actionSelect.value = gestures[key];
  } else {
    modalTitle.textContent = 'Create Action';
    recordedGestureDisplay.textContent = 'Record gesture';
    actionSelect.value = '';
  }
  
  editorModal.classList.remove('hidden');
}

function closeEditor() {
  editorModal.classList.add('hidden');
  editingGestureKey = null;
  currentRecordedPath = [];
}

function deleteGesture(key) {
  if (confirm(`Are you sure you want to delete gesture "${formatGesture(key)}"?`)) {
    delete gestures[key];
    chrome.storage.local.set({ gestures }, () => {
      renderList();
    });
  }
}

saveBtn.addEventListener('click', () => {
  const selectedAction = actionSelect.value;
  const gestureKey = currentRecordedPath.join('-');

  if (!gestureKey) {
    alert('Please record a gesture.');
    return;
  }
  if (!selectedAction) {
    alert('Please select an action.');
    return;
  }

  if (editingGestureKey && editingGestureKey !== gestureKey) {
    delete gestures[editingGestureKey];
  }

  gestures[gestureKey] = selectedAction;

  chrome.storage.local.set({ gestures }, () => {
    closeEditor();
    renderList();
  });
});

cancelBtn.addEventListener('click', closeEditor);
addBtn.addEventListener('click', () => openEditor(null));

// Recorder state
let recStartX = 0;
let recStartY = 0;
let recLastX = 0;
let recLastY = 0;
let recIsMouseDown = false;

gestureRecorder.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    e.preventDefault();
    recStartX = e.clientX;
    recStartY = e.clientY;
    recLastX = e.clientX;
    recLastY = e.clientY;
    recIsMouseDown = true;
    currentRecordedPath = [];
    recordedGestureDisplay.textContent = 'Recording...';
    gestureRecorder.classList.add('recording');
  }
});

gestureRecorder.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (!recIsMouseDown) return;

  const dx = e.clientX - recLastX;
  const dy = e.clientY - recLastY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= 10) {
    let dir = '';
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'R' : 'L';
    } else {
      dir = dy > 0 ? 'D' : 'U';
    }

    if (currentRecordedPath.length === 0 || currentRecordedPath[currentRecordedPath.length - 1] !== dir) {
      currentRecordedPath.push(dir);
      recordedGestureDisplay.textContent = formatGesture(currentRecordedPath.join('-'));
    }

    recLastX = e.clientX;
    recLastY = e.clientY;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 2 && recIsMouseDown) {
    recIsMouseDown = false;
    gestureRecorder.classList.remove('recording');
    if (currentRecordedPath.length === 0) {
      recordedGestureDisplay.textContent = 'Gesture too short. Try again.';
    }
  }
});

// Export
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(gestures, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mouse_gestures_settings.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Import
importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (typeof imported === 'object' && imported !== null) {
        gestures = { ...gestures, ...imported };
        chrome.storage.local.set({ gestures }, () => {
          renderList();
          alert('Settings imported successfully!');
        });
      } else {
        alert('Invalid file format.');
      }
    } catch (err) {
      alert('Error importing settings.');
    }
  };
  reader.readAsText(file);
});

document.addEventListener('DOMContentLoaded', loadGestures);