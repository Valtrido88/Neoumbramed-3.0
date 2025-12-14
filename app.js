const UMBRAMED_CONFIG = (typeof window !== 'undefined' && window.UMBRAMED_CONFIG) ? window.UMBRAMED_CONFIG : {};
const API_URL = UMBRAMED_CONFIG.API_URL || '/api/questions';

let allRecords = [];
let currentOffset = null;
let currentPage = 1;
const pageSize = 10;
let isEditing = false;
let currentEditId = null;
let deleteId = null;

// Navigation & View Logic
window.enterApp = function(view = 'specialties') {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    switchView(view);
}

window.showLanding = function() {
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
}

window.switchView = function(viewName) {
    // Hide all views
    ['specialties-view', 'exams-view', 'library-view', 'practice-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // Show selected view
    const viewId = viewName.endsWith('-view') ? viewName : `${viewName}-view`;
    const el = document.getElementById(viewId);
    if (el) el.classList.remove('hidden');

    // Update Nav State
    document.querySelectorAll('nav button[id^="nav-"]').forEach(btn => {
        btn.classList.remove('text-white', 'border-b-2', 'border-white');
        btn.classList.add('text-green-100');
    });
    
    const navBtn = document.getElementById(`nav-${viewName}`);
    if (navBtn) {
        navBtn.classList.remove('text-green-100');
        navBtn.classList.add('text-white', 'border-b-2', 'border-white');
    }

    // View specific logic
    if (viewName === 'specialties') {
        renderSpecialties();
    } else if (viewName === 'practice') {
        initPracticeMode();
    }
}

window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('hidden');
}

function renderSpecialties() {
    const grid = document.getElementById('specialties-grid');
    if (!grid) return;
    
    // Extract specialties from allRecords
    const specialties = new Set();
    allRecords.forEach(r => {
        const s = r.fields['Specialty Names'];
        if (s && Array.isArray(s)) s.forEach(name => specialties.add(name));
        else if (s) specialties.add(s);
    });
    
    if (specialties.size === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500">Cargando especialidades o no hay datos disponibles...</p>';
        return;
    }

    grid.innerHTML = Array.from(specialties).sort().map(spec => `
        <div class="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-100" onclick="openSpecialty('${spec}')">
            <div class="flex items-center justify-between mb-4">
                <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-betis-green">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                </div>
                <span class="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    ${allRecords.filter(r => {
                        const s = r.fields['Specialty Names'];
                        return Array.isArray(s) ? s.includes(spec) : s === spec;
                    }).length} preguntas
                </span>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-1">${spec}</h3>
            <p class="text-sm text-gray-500">Practicar preguntas de ${spec}</p>
        </div>
    `).join('');
}

window.openSpecialty = function(spec) {
    console.log('Opening specialty:', spec);
    showToast(`Seleccionada especialidad: ${spec}`);
    // Filter for practice mode
    practiceQuestions = allRecords.filter(r => {
        const s = r.fields['Specialty Names'];
        return Array.isArray(s) ? s.includes(spec) : s === spec;
    }).sort(() => Math.random() - 0.5);
    
    switchView('practice');
    // initPracticeMode will be called by switchView, but we want to keep our filtered list
    // So we need to modify initPracticeMode to respect existing list if set?
    // Or just set it here and make initPracticeMode check if empty?
    // Let's adjust initPracticeMode.
}

// Practice Mode Logic
let currentPracticeIndex = 0;
let practiceQuestions = [];

function initPracticeMode() {
    // Only reset if empty (first load) or if we want to reset.
    // If we came from openSpecialty, practiceQuestions is already set.
    if (practiceQuestions.length === 0) {
        practiceQuestions = [...allRecords].sort(() => Math.random() - 0.5);
    }
    currentPracticeIndex = 0;
    showPracticeQuestion();
}

function showPracticeQuestion() {
    const container = document.getElementById('exam-content');
    if (!container || practiceQuestions.length === 0) {
        if (container) container.innerHTML = '<p class="text-center">No hay preguntas disponibles para practicar.</p>';
        return;
    }

    const q = practiceQuestions[currentPracticeIndex];
    const f = q.fields;
    
    document.getElementById('current-q-num').textContent = currentPracticeIndex + 1;
    document.getElementById('total-q-num').textContent = practiceQuestions.length;
    
    document.getElementById('exam-question-text').textContent = f['Question Text'] || 'Sin texto';
    
    const optionsContainer = document.getElementById('exam-options');
    optionsContainer.innerHTML = ['A', 'B', 'C', 'D'].map(opt => `
        <div class="option-card p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" onclick="selectOption('${opt}')" id="opt-${opt}">
            <span class="font-bold mr-2">${opt})</span> ${escapeHtml(f[`Option ${opt}`] || '')}
        </div>
    `).join('');
    
    document.getElementById('exam-feedback').classList.add('hidden');
    document.getElementById('check-btn').classList.remove('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    
    // Reset selection
    document.querySelectorAll('.option-card').forEach(el => el.classList.remove('bg-blue-50', 'border-blue-500'));
    selectedOption = null;
}

let selectedOption = null;
window.s
        // Update UI based on current view
        const currentView = document.querySelector('div[id$="-view"]:not(.hidden)');
        if (currentView && currentView.id === 'specialties-view') {
            renderSpecialties();
        } else {
            renderTable();
        }
        function(opt) {
    if (document.getElementById('exam-feedback').classList.contains('hidden') === false) return; // Already checked
    
    selectedOption = opt;
    document.querySelectorAll('.option-card').forEach(el => {
        el.classList.remove('bg-blue-50', 'border-blue-500', 'ring-2', 'ring-blue-200');
    });
    const el = document.getElementById(`opt-${opt}`);
    if (el) el.classList.add('bg-blue-50', 'border-blue-500', 'ring-2', 'ring-blue-200');
}

window.checkAnswer = function() {
    if (!selectedOption) {
        showToast('Por favor selecciona una opción', 'error');
        return;
    }
    
    const q = practiceQuestions[currentPracticeIndex];
    const correct = q.fields['Correct Answer'];
    
    const feedback = document.getElementById('exam-feedback');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');
    
    feedback.classList.remove('hidden');
    
    if (selectedOption === correct) {
        feedback.className = 'mt-6 p-4 rounded-lg bg-green-50 border border-green-200';
        feedbackTitle.textContent = '¡Correcto!';
        feedbackTitle.className = 'font-bold text-lg mb-2 text-green-800';
        feedbackText.textContent = 'Has seleccionado la respuesta correcta.';
        
        document.getElementById(`opt-${selectedOption}`).classList.add('bg-green-100', 'border-green-500');
    } else {
        feedback.className = 'mt-6 p-4 rounded-lg bg-red-50 border border-red-200';
        feedbackTitle.textContent = 'Incorrecto';
        feedbackTitle.className = 'font-bold text-lg mb-2 text-red-800';
        feedbackText.textContent = `La respuesta correcta era la ${correct}.`;
        
        document.getElementById(`opt-${selectedOption}`).classList.add('bg-red-100', 'border-red-500');
        document.getElementById(`opt-${correct}`).classList.add('bg-green-100', 'border-green-500');
    }
    
    document.getElementById('check-btn').classList.add('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
}

window.nextQuestion = function() {
    if (currentPracticeIndex < practiceQuestions.length - 1) {
        currentPracticeIndex++;
        showPracticeQuestion();
    } else {
        showToast('Has completado todas las preguntas de esta sesión.');
    }
}

window.prevQuestion = function() {
    if (currentPracticeIndex > 0) {
        currentPracticeIndex--;
        showPracticeQuestion();
    }
}

// DOM Elements - will be initialized after DOMContentLoaded
let tableBody;
let prevPageBtn;
let nextPageBtn;
let showingRange;
let totalRecordsSpan;
let searchInput;
let sortSelect;
let refreshBtn;
let questionForm;
let modalTitle;
let confirmDeleteBtn;

// Modal Instances
let questionModal;
let deleteModal;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM Elements
    tableBody = document.getElementById('questions-table-body');
    prevPageBtn = document.getElementById('prev-page');
    nextPageBtn = document.getElementById('next-page');
    showingRange = document.getElementById('showing-range');
    totalRecordsSpan = document.getElementById('total-records');
    searchInput = document.getElementById('simple-search');
    sortSelect = document.getElementById('sort-select');
    refreshBtn = document.getElementById('refresh-btn');
    questionForm = document.getElementById('question-form');
    modalTitle = document.getElementById('modal-title');
    confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // Initialize Modals
    const $questionModalEl = document.getElementById('question-modal');
    const $deleteModalEl = document.getElementById('delete-modal');
    
    // Check if Flowbite is loaded
    if (typeof Modal !== 'undefined') {
        questionModal = new Modal($questionModalEl);
        deleteModal = new Modal($deleteModalEl);
    } else {
        console.error('Flowbite Modal not loaded');
    }

    // Don't fetch on load - wait for user to enter the app
    fetchQuestions();

    // Event Listeners - only add if elements exist
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            currentOffset = null;
            currentPage = 1;
            fetchQuestions();
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if ((currentPage * pageSize) < allRecords.length) {
                currentPage++;
                renderTable();
            } else if (currentOffset) {
                currentPage++;
                fetchQuestions(currentOffset);
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value;
            if (searchTerm.length > 2 || searchTerm.length === 0) {
                currentOffset = null;
                currentPage = 1;
                fetchQuestions(null, searchTerm);
            }
        }, 500));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentOffset = null;
            currentPage = 1;
            fetchQuestions(null, searchInput ? searchInput.value : '');
        });
    }

    if (questionForm) {
        questionForm.addEventListener('submit', handleFormSubmit);
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', executeDelete);
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function fetchQuestions(offset = null, searchTerm = '') {
    let url = `${API_URL}?pageSize=100`;
    
    // Sorting
    const [sortField, sortDir] = sortSelect.value.split('-');
    url += `&sort%5B0%5D%5Bfield%5D=${encodeURIComponent(sortField)}&sort%5B0%5D%5Bdirection%5D=${sortDir}`;

    if (searchTerm) {
        const formula = `SEARCH(LOWER("${searchTerm}"), LOWER({Question Text}))`;
        url += `&filterByFormula=${encodeURIComponent(formula)}`;
    }

    if (offset) {
        url += `&offset=${offset}`;
    }

    try {
        setLoading(true);
        const response = await fetch(url);

        if (!response.ok) throw new Error('Error fetching data');

        const data = await response.json();
        
        if (!offset) {
            allRecords = data.records;
        } else {
            allRecords = [...allRecords, ...data.records];
        }

        currentOffset = data.offset;
        renderTable();
        setLoading(false);

    } catch (error) {
        console.error('Error:', error);
        setLoading(false);
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error al cargar datos. Verifique la consola.</td></tr>`;
        showToast('Error al cargar datos', 'error');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderTable(records = allRecords) {
    // If loading and no records yet, show skeleton
    // But here we usually have records or we are fetching. 
    // We will handle skeleton in setLoading instead or check if records is empty while loading.
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageRecords = records.slice(start, end);

    tableBody.innerHTML = '';

    if (pageRecords.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 class="mt-2 text-sm font-semibold text-gray-900">No hay preguntas</h3>
                    <p class="mt-1 text-sm text-gray-500">Comienza creando una nueva pregunta.</p>
                    <div class="mt-4">
                        <button onclick="openCreateModal()" class="inline-flex items-center rounded-md bg-betis-green px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
                            <svg class="mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                            </svg>
                            Nueva Pregunta
                        </button>
                    </div>
                </td>
            </tr>`;
        return;
    }

    pageRecords.forEach(record => {
        const fields = record.fields;
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-gray-50 transition-colors';
        
        const correctAnswer = fields['Correct Answer'] || '-';
        const getOptionClass = (opt) => opt === correctAnswer ? 'text-green-600 font-bold' : 'text-gray-500';

        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap text-xs">${record.id}</td>
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900 mb-1 line-clamp-2" title="${escapeHtml(fields['Question Text'] || '')}">${escapeHtml(fields['Question Text'] || '-')}</div>
                <div class="text-xs text-gray-400">#${fields['Question Number'] || '?'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="grid grid-cols-1 gap-1 text-xs">
                    <div class="${getOptionClass('A')}"><span class="font-semibold">A:</span> ${escapeHtml(fields['Option A'] || '-')}</div>
                    <div class="${getOptionClass('B')}"><span class="font-semibold">B:</span> ${escapeHtml(fields['Option B'] || '-')}</div>
                    <div class="${getOptionClass('C')}"><span class="font-semibold">C:</span> ${escapeHtml(fields['Option C'] || '-')}</div>
                    <div class="${getOptionClass('D')}"><span class="font-semibold">D:</span> ${escapeHtml(fields['Option D'] || '-')}</div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-green-400">
                    ${correctAnswer}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex space-x-2">
                    <button onclick="openEditModal('${record.id}')" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-xs px-3 py-2 focus:outline-none">Editar</button>
                    <button onclick="openDeleteModal('${record.id}')" class="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-xs px-3 py-2 focus:outline-none">Eliminar</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update Pagination Info
    showingRange.textContent = `${start + 1}-${Math.min(end, records.length)}`;
    totalRecordsSpan.textContent = records.length + (currentOffset ? '+' : '');
    
    prevPageBtn.disabled = currentPage === 1;
    prevPageBtn.classList.toggle('opacity-50', currentPage === 1);
    prevPageBtn.classList.toggle('cursor-not-allowed', currentPage === 1);
    
    const hasMore = (currentPage * pageSize) < records.length || !!currentOffset;
    nextPageBtn.disabled = !hasMore;
    nextPageBtn.classList.toggle('opacity-50', !hasMore);
    nextPageBtn.classList.toggle('cursor-not-allowed', !hasMore);
}

function setLoading(isLoading) {
    if (isLoading) {
        refreshBtn.innerHTML = `<svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-gray-200 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#1C64F2"/></svg> Cargando...`;
        
        // Skeleton Loader
        tableBody.innerHTML = Array(5).fill(0).map(() => `
            <tr class="bg-white border-b animate-pulse">
                <td class="px-6 py-4"><div class="h-2.5 bg-gray-200 rounded-full w-12"></div></td>
                <td class="px-6 py-4">
                    <div class="h-2.5 bg-gray-200 rounded-full w-48 mb-2"></div>
                    <div class="h-2 bg-gray-200 rounded-full w-24"></div>
                </td>
                <td class="px-6 py-4">
                    <div class="h-2 bg-gray-200 rounded-full w-32 mb-1"></div>
                    <div class="h-2 bg-gray-200 rounded-full w-32 mb-1"></div>
                    <div class="h-2 bg-gray-200 rounded-full w-32 mb-1"></div>
                    <div class="h-2 bg-gray-200 rounded-full w-32"></div>
                </td>
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-8"></div></td>
                <td class="px-6 py-4"><div class="h-8 bg-gray-200 rounded w-20"></div></td>
            </tr>
        `).join('');
        
    } else {
        refreshBtn.innerHTML = 'Actualizar';
    }
}

// CRUD Operations

window.openCreateModal = function() {
    isEditing = false;
    currentEditId = null;
    modalTitle.textContent = 'Nueva Pregunta';
    questionForm.reset();
    questionModal.show();
}

window.openEditModal = function(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;

    isEditing = true;
    currentEditId = id;
    modalTitle.textContent = 'Editar Pregunta';
    
    const f = record.fields;
    document.getElementById('question-text').value = f['Question Text'] || '';
    document.getElementById('option-a').value = f['Option A'] || '';
    document.getElementById('option-b').value = f['Option B'] || '';
    document.getElementById('option-c').value = f['Option C'] || '';
    document.getElementById('option-d').value = f['Option D'] || '';
    document.getElementById('correct-answer').value = f['Correct Answer'] || 'A';
    document.getElementById('question-number').value = f['Question Number'] || '';

    questionModal.show();
}

window.openDeleteModal = function(id) {
    deleteId = id;
    deleteModal.show();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icon = type === 'success' 
        ? '<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg"><svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20"><path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/></svg></div>'
        : '<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg"><svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20"><path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z"/></svg></div>';

    toast.className = 'flex items-center w-full max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800 transition-opacity duration-300 opacity-0 transform translate-y-2';
    toast.innerHTML = `
        ${icon}
        <div class="ms-3 text-sm font-normal">${message}</div>
        <button type="button" class="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8" onclick="this.parentElement.remove()">
            <span class="sr-only">Cerrar</span>
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
        </button>
    `;

    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const data = {
        fields: {
            'Question Text': document.getElementById('question-text').value,
            'Option A': document.getElementById('option-a').value,
            'Option B': document.getElementById('option-b').value,
            'Option C': document.getElementById('option-c').value,
            'Option D': document.getElementById('option-d').value,
            'Correct Answer': document.getElementById('correct-answer').value,
            'Question Number': parseInt(document.getElementById('question-number').value) || 0
        }
    };

    try {
        const submitBtn = questionForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#1C64F2"/></svg> Guardando...`;

        const url = isEditing ? `${API_URL}/${currentEditId}` : API_URL;
        const method = isEditing ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error saving data');

        questionModal.hide();
        questionForm.reset();
        showToast(isEditing ? 'Pregunta actualizada correctamente' : 'Pregunta creada correctamente');
        
        // Refresh data
        currentOffset = null;
        currentPage = 1;
        fetchQuestions();

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

    } catch (error) {
        console.error('Error saving:', error);
        showToast('Error al guardar. Revisa la consola.', 'error');
        const submitBtn = questionForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Guardar Pregunta'; // Fallback text
    }
}

async function executeDelete() {
    if (!deleteId) return;

    try {
        const response = await fetch(`${API_URL}/${deleteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
eModal.hide();
        deleteId = null;
        showToast('Pregunta eliminada correctamente');
        
        // Refresh data
        currentOffset = null;
        currentPage = 1;
        fetchQuestions();

    } catch (error) {
        console.error('Error deleting:', error);
        showToast('Error al eliminar. Revisa la consola.', 'error');
    }
}
