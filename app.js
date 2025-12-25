const UMBRAMED_CONFIG = (typeof window !== 'undefined' && window.UMBRAMED_CONFIG) ? window.UMBRAMED_CONFIG : {};
const API_URL = UMBRAMED_CONFIG.API_URL || '/api/questions';

let allRecords = [];
let currentOffset = null;
let currentPage = 1;
const pageSize = 10;
let isEditing = false;
let currentEditId = null;
let deleteId = null;

// Navigation history stack for back navigation
let navigationHistory = ['tools'];

// Navigation & View Logic
window.enterApp = function(view = 'tools') {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    navigationHistory = [view];
    switchView(view, false);
    
    // Update URL hash for browser history
    updateUrlHash(view);
}

window.showLanding = function() {
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
    navigationHistory = [];
    window.history.pushState({ view: 'landing' }, '', '#');
}

// Helper to update URL hash
function updateUrlHash(viewName) {
    const hash = viewName || 'tools';
    if (window.location.hash !== `#${hash}`) {
        window.history.pushState({ view: viewName }, '', `#${viewName}`);
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.view) {
        if (event.state.view === 'landing') {
            showLanding();
        } else {
            const landingPage = document.getElementById('landing-page');
            const appLayout = document.getElementById('app-layout');
            
            if (!landingPage.classList.contains('hidden')) {
                landingPage.classList.add('hidden');
                appLayout.classList.remove('hidden');
            }
            switchView(event.state.view, false);
        }
    }
});

window.switchView = function(viewName, addToHistory = true) {
    // Hide all views with fade out effect
    const allViews = ['specialties-view', 'exams-view', 'library-view', 'practice-view', 'tools-view', 'pediatric-dosing-view', 'imc-calculator-view', 'clearance-calculator-view'];
    
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // Show selected view
    const viewId = viewName.endsWith('-view') ? viewName : `${viewName}-view`;
    const el = document.getElementById(viewId);
    if (el) {
        el.classList.remove('hidden');
    }

    // Update Nav State - highlight correct nav button
    document.querySelectorAll('nav button[id^="nav-"]').forEach(btn => {
        btn.classList.remove('text-white', 'border-b-2', 'border-white');
        btn.classList.add('text-red-100');
    });
    
    // Determine which nav button to highlight
    let navKey = viewName;
    if (['pediatric-dosing', 'imc-calculator', 'clearance-calculator', 'practice'].includes(viewName)) {
        navKey = 'tools';
    }
    
    const navBtn = document.getElementById(`nav-${navKey}`);
    if (navBtn) {
        navBtn.classList.remove('text-red-100');
        navBtn.classList.add('text-white', 'border-b-2', 'border-white');
    }

    // Add to navigation history for back button support
    if (addToHistory) {
        // Don't add if it's the same as the last view
        if (navigationHistory[navigationHistory.length - 1] !== viewName) {
            navigationHistory.push(viewName);
        }
        updateUrlHash(viewName);
    }

    // View specific logic
    if (viewName === 'specialties') {
        renderSpecialties();
    } else if (viewName === 'practice') {
        initPracticeMode();
    } else if (viewName === 'pediatric-dosing') {
        initPediatricDosing();
    }
    
    // Scroll to top when switching views
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go back from practice view
window.goBackFromPractice = function() {
    // Remove current view from history
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        const previousView = navigationHistory[navigationHistory.length - 1];
        switchView(previousView, false);
    } else {
        switchView('tools', false);
    }
    // Reset practice questions so next time it loads fresh
    practiceQuestions = [];
}

// Mobile menu functions
window.toggleMobileMenu = function(event) {
    if (event) event.stopPropagation();
    
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    const iconOpen = document.getElementById('menu-icon-open');
    const iconClose = document.getElementById('menu-icon-close');
    
    if (menu) {
        const isHidden = menu.classList.contains('hidden');
        
        if (isHidden) {
            // Show menu
            menu.classList.remove('hidden');
            if (overlay) overlay.classList.remove('hidden');
            if (iconOpen) iconOpen.classList.add('hidden');
            if (iconClose) iconClose.classList.remove('hidden');
        } else {
            closeMobileMenu();
        }
    }
}

window.closeMobileMenu = function() {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    const iconOpen = document.getElementById('menu-icon-open');
    const iconClose = document.getElementById('menu-icon-close');
    
    if (menu) menu.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    if (iconOpen) iconOpen.classList.remove('hidden');
    if (iconClose) iconClose.classList.add('hidden');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('mobile-menu');
    const menuBtn = document.getElementById('mobile-menu-btn');
    
    if (menu && !menu.classList.contains('hidden')) {
        if (!menu.contains(event.target) && !menuBtn.contains(event.target)) {
            closeMobileMenu();
        }
    }
});

// Close mobile menu on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeMobileMenu();
    }
});

// Handle initial URL hash on page load
window.addEventListener('DOMContentLoaded', function() {
    const hash = window.location.hash.slice(1);
    if (hash && hash !== 'landing') {
        enterApp(hash);
    }
});

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

window.selectOption = function(opt) {
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
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error deleting data');
        
        deleteModal.hide();
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

// ===== PEDIATRIC DOSING DATABASE =====
const PEDIATRIC_DRUGS = [
    // ANTIBIÓTICOS
    { name: 'Amoxicilina', category: 'Antibiótico', dosePerKg: 50, frequency: 'cada 8h', maxDose: 3000, unit: 'mg', indications: 'Infecciones respiratorias, otitis media, faringitis', presentations: ['Suspensión 250mg/5mL', 'Suspensión 500mg/5mL', 'Cápsulas 500mg'], warnings: ['Alergia a penicilinas', 'Ajustar en insuficiencia renal'] },
    { name: 'Amoxicilina/Ác. Clavulánico', category: 'Antibiótico', dosePerKg: 50, frequency: 'cada 8h', maxDose: 3000, unit: 'mg', indications: 'Infecciones respiratorias complicadas, sinusitis, otitis resistente', presentations: ['Suspensión 250/62.5mg/5mL', 'Suspensión 400/57mg/5mL', 'Comprimidos 875/125mg'], warnings: ['Alergia a penicilinas', 'Hepatotoxicidad', 'Diarrea'] },
    { name: 'Azitromicina', category: 'Antibiótico', dosePerKg: 10, frequency: 'cada 24h x 3-5 días', maxDose: 500, unit: 'mg', indications: 'Infecciones respiratorias, otitis, faringitis en alérgicos a penicilina', presentations: ['Suspensión 200mg/5mL', 'Comprimidos 500mg'], warnings: ['Prolongación QT', 'Interacciones medicamentosas'] },
    { name: 'Claritromicina', category: 'Antibiótico', dosePerKg: 15, frequency: 'cada 12h', maxDose: 1000, unit: 'mg', indications: 'Infecciones respiratorias, H. pylori', presentations: ['Suspensión 125mg/5mL', 'Suspensión 250mg/5mL', 'Comprimidos 500mg'], warnings: ['Prolongación QT', 'Interacciones con estatinas'] },
    { name: 'Cefuroxima', category: 'Antibiótico', dosePerKg: 30, frequency: 'cada 12h', maxDose: 1000, unit: 'mg', indications: 'Infecciones respiratorias, ORL, piel', presentations: ['Suspensión 125mg/5mL', 'Suspensión 250mg/5mL', 'Comprimidos 500mg'], warnings: ['Alergia a cefalosporinas', 'Reacción cruzada con penicilinas 1-2%'] },
    { name: 'Cefixima', category: 'Antibiótico', dosePerKg: 8, frequency: 'cada 12-24h', maxDose: 400, unit: 'mg', indications: 'ITU, infecciones respiratorias, otitis', presentations: ['Suspensión 100mg/5mL', 'Cápsulas 400mg'], warnings: ['Alergia a cefalosporinas', 'Colitis pseudomembranosa'] },
    { name: 'Ceftriaxona', category: 'Antibiótico', dosePerKg: 50, frequency: 'cada 24h IV/IM', maxDose: 4000, unit: 'mg', indications: 'Meningitis, sepsis, infecciones graves', presentations: ['Vial 250mg', 'Vial 1g', 'Vial 2g'], warnings: ['No usar en neonatos con ictericia', 'No mezclar con calcio IV'] },
    { name: 'Trimetoprim/Sulfametoxazol', category: 'Antibiótico', dosePerKg: 8, frequency: 'cada 12h (TMP)', maxDose: 320, unit: 'mg TMP', indications: 'ITU, infecciones respiratorias, Pneumocystis', presentations: ['Suspensión 40/200mg/5mL', 'Comprimidos 80/400mg', 'Comprimidos Forte 160/800mg'], warnings: ['Alergia a sulfas', 'Hiperpotasemia', 'Toxicidad hematológica'] },
    { name: 'Ciprofloxacino', category: 'Antibiótico', dosePerKg: 20, frequency: 'cada 12h', maxDose: 1500, unit: 'mg', indications: 'ITU complicada, infecciones graves (uso restringido en pediatría)', presentations: ['Suspensión 250mg/5mL', 'Comprimidos 500mg', 'Comprimidos 750mg'], warnings: ['Tendinopatía', 'Artropatía en niños', 'Fotosensibilidad'] },
    { name: 'Gentamicina', category: 'Antibiótico', dosePerKg: 5, frequency: 'cada 24h IV/IM', maxDose: 400, unit: 'mg', indications: 'Infecciones graves por gram negativos', presentations: ['Ampolla 80mg/2mL', 'Ampolla 20mg/2mL'], warnings: ['Nefrotoxicidad', 'Ototoxicidad', 'Monitorizar niveles'] },
    { name: 'Vancomicina', category: 'Antibiótico', dosePerKg: 40, frequency: 'cada 6h IV', maxDose: 4000, unit: 'mg', indications: 'Infecciones por MRSA, meningitis', presentations: ['Vial 500mg', 'Vial 1g'], warnings: ['Síndrome del hombre rojo', 'Nefrotoxicidad', 'Monitorizar niveles'] },
    { name: 'Clindamicina', category: 'Antibiótico', dosePerKg: 30, frequency: 'cada 8h', maxDose: 1800, unit: 'mg', indications: 'Infecciones de piel, hueso, anaerobios', presentations: ['Solución oral 75mg/5mL', 'Cápsulas 300mg'], warnings: ['Colitis pseudomembranosa', 'Diarrea'] },
    { name: 'Metronidazol', category: 'Antibiótico', dosePerKg: 30, frequency: 'cada 8h', maxDose: 2000, unit: 'mg', indications: 'Infecciones anaerobias, Giardia, Clostridium difficile', presentations: ['Suspensión 125mg/5mL', 'Comprimidos 250mg', 'Comprimidos 500mg'], warnings: ['Efecto antabús', 'Neuropatía periférica'] },
    { name: 'Nitrofurantoína', category: 'Antibiótico', dosePerKg: 5, frequency: 'cada 6h', maxDose: 400, unit: 'mg', indications: 'ITU baja, profilaxis ITU', presentations: ['Suspensión 25mg/5mL', 'Cápsulas 50mg', 'Cápsulas 100mg'], warnings: ['Neuropatía periférica', 'Fibrosis pulmonar (uso prolongado)', 'Contraindicado <1 mes'] },
    { name: 'Fosfomicina', category: 'Antibiótico', dosePerKg: 100, frequency: 'cada 8h', maxDose: 3000, unit: 'mg', indications: 'ITU, infecciones urinarias no complicadas', presentations: ['Sobres 3g (dosis única adultos)', 'Suspensión oral'], warnings: ['Diarrea', 'Cefalea'] },

    // ANALGÉSICOS Y ANTIPIRÉTICOS
    { name: 'Paracetamol', category: 'Analgésico/Antipirético', dosePerKg: 15, frequency: 'cada 4-6h', maxDose: 4000, unit: 'mg', indications: 'Fiebre, dolor leve-moderado', presentations: ['Gotas 100mg/mL', 'Jarabe 120mg/5mL', 'Jarabe 160mg/5mL', 'Supositorios', 'Comprimidos 500mg'], warnings: ['Hepatotoxicidad en sobredosis', 'Máx 5 dosis/día'] },
    { name: 'Ibuprofeno', category: 'AINE', dosePerKg: 10, frequency: 'cada 6-8h', maxDose: 2400, unit: 'mg', indications: 'Fiebre, dolor, inflamación', presentations: ['Suspensión 100mg/5mL', 'Suspensión 200mg/5mL', 'Comprimidos 400mg', 'Comprimidos 600mg'], warnings: ['Gastropatía', 'Nefrotoxicidad', 'Evitar en deshidratación', 'Contraindicado <6 meses'] },
    { name: 'Metamizol (Dipirona)', category: 'Analgésico/Antipirético', dosePerKg: 15, frequency: 'cada 6-8h', maxDose: 4000, unit: 'mg', indications: 'Dolor moderado-severo, fiebre refractaria', presentations: ['Gotas 500mg/mL', 'Cápsulas 575mg', 'Ampollas 2g/5mL'], warnings: ['Agranulocitosis (rara)', 'Hipotensión IV', 'Contraindicado <3 meses'] },
    { name: 'Naproxeno', category: 'AINE', dosePerKg: 10, frequency: 'cada 12h', maxDose: 1000, unit: 'mg', indications: 'Dolor, inflamación, artritis juvenil', presentations: ['Suspensión 125mg/5mL', 'Comprimidos 250mg', 'Comprimidos 500mg'], warnings: ['Gastropatía', 'Nefrotoxicidad', 'Mayor riesgo cardiovascular'] },
    { name: 'Ketorolaco', category: 'AINE', dosePerKg: 0.5, frequency: 'cada 6h (max 2 días)', maxDose: 40, unit: 'mg', indications: 'Dolor postoperatorio moderado-severo', presentations: ['Comprimidos 10mg', 'Ampollas 30mg/mL'], warnings: ['Uso máximo 2 días', 'Alto riesgo GI', 'Contraindicado <16 años para oral'] },
    { name: 'Tramadol', category: 'Opioide débil', dosePerKg: 2, frequency: 'cada 6-8h', maxDose: 400, unit: 'mg', indications: 'Dolor moderado-severo', presentations: ['Gotas 100mg/mL', 'Cápsulas 50mg'], warnings: ['Depresión respiratoria', 'Náuseas', 'Estreñimiento', '>12 años generalmente'] },
    { name: 'Morfina', category: 'Opioide', dosePerKg: 0.1, frequency: 'cada 4h IV/SC', maxDose: 15, unit: 'mg/dosis', indications: 'Dolor severo, cuidados paliativos', presentations: ['Ampollas 10mg/mL', 'Solución oral 2mg/mL'], warnings: ['Depresión respiratoria', 'Monitorización continua', 'Estreñimiento'] },

    // ANTIHISTAMÍNICOS
    { name: 'Cetirizina', category: 'Antihistamínico', dosePerKg: 0.25, frequency: 'cada 24h', maxDose: 10, unit: 'mg', indications: 'Rinitis alérgica, urticaria', presentations: ['Gotas 10mg/mL', 'Jarabe 5mg/5mL', 'Comprimidos 10mg'], warnings: ['Somnolencia (menos que 1ª generación)', 'Ajustar en insuficiencia renal'] },
    { name: 'Loratadina', category: 'Antihistamínico', dosePerKg: 0.2, frequency: 'cada 24h', maxDose: 10, unit: 'mg', indications: 'Rinitis alérgica, urticaria', presentations: ['Jarabe 5mg/5mL', 'Comprimidos 10mg'], warnings: ['Baja sedación', 'Seguro en pediatría'] },
    { name: 'Desloratadina', category: 'Antihistamínico', dosePerKg: 0.1, frequency: 'cada 24h', maxDose: 5, unit: 'mg', indications: 'Rinitis alérgica, urticaria crónica', presentations: ['Jarabe 0.5mg/mL', 'Comprimidos 5mg'], warnings: ['Mínima sedación'] },
    { name: 'Difenhidramina', category: 'Antihistamínico', dosePerKg: 5, frequency: 'cada 6-8h', maxDose: 300, unit: 'mg', indications: 'Reacciones alérgicas, urticaria, sedación', presentations: ['Jarabe 12.5mg/5mL', 'Cápsulas 25mg', 'Ampollas 50mg/mL'], warnings: ['Sedación marcada', 'Efectos anticolinérgicos', 'Excitación paradójica en niños'] },
    { name: 'Hidroxicina', category: 'Antihistamínico', dosePerKg: 2, frequency: 'cada 6-8h', maxDose: 100, unit: 'mg', indications: 'Prurito, urticaria, ansiedad', presentations: ['Jarabe 10mg/5mL', 'Comprimidos 25mg'], warnings: ['Sedación', 'Prolongación QT'] },
    { name: 'Dexclorfeniramina', category: 'Antihistamínico', dosePerKg: 0.15, frequency: 'cada 6-8h', maxDose: 12, unit: 'mg', indications: 'Reacciones alérgicas, rinitis', presentations: ['Jarabe 2mg/5mL', 'Comprimidos 2mg', 'Ampollas 5mg/mL'], warnings: ['Sedación', 'Efectos anticolinérgicos'] },

    // ANTITUSÍGENOS Y MUCOLÍTICOS
    { name: 'Dextrometorfano', category: 'Antitusígeno', dosePerKg: 0.5, frequency: 'cada 6-8h', maxDose: 120, unit: 'mg', indications: 'Tos seca no productiva', presentations: ['Jarabe 15mg/5mL', 'Gotas'], warnings: ['No usar <2 años', 'Interacción con IMAO', 'Abuso potencial'] },
    { name: 'Acetilcisteína', category: 'Mucolítico', dosePerKg: 10, frequency: 'cada 8h', maxDose: 600, unit: 'mg', indications: 'Tos productiva, fibrosis quística, intoxicación por paracetamol', presentations: ['Sobres 100mg', 'Sobres 200mg', 'Sobres 600mg', 'Ampollas IV'], warnings: ['Broncoespasmo en asmáticos', 'Náuseas'] },
    { name: 'Ambroxol', category: 'Mucolítico', dosePerKg: 1.5, frequency: 'cada 8-12h', maxDose: 120, unit: 'mg', indications: 'Tos productiva, bronquitis', presentations: ['Jarabe 15mg/5mL', 'Jarabe 30mg/5mL', 'Comprimidos 30mg'], warnings: ['Bien tolerado', 'Posibles molestias GI'] },
    { name: 'Carbocisteína', category: 'Mucolítico', dosePerKg: 15, frequency: 'cada 8h', maxDose: 2250, unit: 'mg', indications: 'Tos productiva', presentations: ['Jarabe 100mg/5mL', 'Jarabe 250mg/5mL'], warnings: ['Molestias gastrointestinales'] },

    // BRONCODILATADORES
    { name: 'Salbutamol (inhalado)', category: 'Broncodilatador', dosePerKg: 0, frequency: '2-4 puff cada 4-6h PRN', maxDose: 0, unit: 'puff', indications: 'Asma, broncoespasmo, bronquiolitis', presentations: ['MDI 100mcg/puff', 'Solución para nebulizar 5mg/mL'], warnings: ['Taquicardia', 'Temblor', 'Hipopotasemia'] },
    { name: 'Salbutamol (nebulizado)', category: 'Broncodilatador', dosePerKg: 0.15, frequency: 'cada 20min x3, luego cada 4-6h', maxDose: 5, unit: 'mg', indications: 'Crisis asmática, broncoespasmo severo', presentations: ['Solución 5mg/mL'], warnings: ['Taquicardia', 'Temblor', 'Monitorizar potasio'] },
    { name: 'Bromuro de Ipratropio', category: 'Anticolinérgico', dosePerKg: 0, frequency: '2-4 puff cada 6-8h', maxDose: 0, unit: 'puff', indications: 'Asma, EPOC, broncoespasmo', presentations: ['MDI 20mcg/puff', 'Solución nebulizar 250mcg/mL'], warnings: ['Sequedad bucal', 'Retención urinaria (rara)'] },
    { name: 'Budesonida (inhalada)', category: 'Corticoide inhalado', dosePerKg: 0, frequency: '1-2 puff cada 12h', maxDose: 0, unit: 'mcg', indications: 'Asma persistente, control mantenimiento', presentations: ['MDI 100mcg', 'MDI 200mcg', 'Turbuhaler 200mcg', 'Nebulización 0.5mg/2mL'], warnings: ['Candidiasis oral', 'Enjuagar boca tras uso', 'Retraso crecimiento (dosis altas)'] },
    { name: 'Fluticasona (inhalada)', category: 'Corticoide inhalado', dosePerKg: 0, frequency: '1-2 puff cada 12h', maxDose: 0, unit: 'mcg', indications: 'Asma persistente', presentations: ['MDI 50mcg', 'MDI 125mcg', 'MDI 250mcg'], warnings: ['Candidiasis oral', 'Enjuagar boca'] },
    { name: 'Montelukast', category: 'Antileucotrieno', dosePerKg: 0, frequency: 'cada 24h', maxDose: 10, unit: 'mg', indications: 'Asma, rinitis alérgica', presentations: ['Sobres 4mg (6m-5a)', 'Comprimidos masticables 5mg (6-14a)', 'Comprimidos 10mg (>15a)'], warnings: ['Efectos neuropsiquiátricos (raros)', 'Monitorizar comportamiento'] },

    // CORTICOIDES SISTÉMICOS
    { name: 'Prednisona', category: 'Corticoide', dosePerKg: 1, frequency: 'cada 24h (mañana)', maxDose: 60, unit: 'mg', indications: 'Asma aguda, crup, enfermedades autoinmunes', presentations: ['Comprimidos 5mg', 'Comprimidos 10mg', 'Comprimidos 30mg'], warnings: ['No suspender bruscamente', 'Hiperglucemia', 'Inmunosupresión'] },
    { name: 'Prednisolona', category: 'Corticoide', dosePerKg: 1, frequency: 'cada 24h', maxDose: 60, unit: 'mg', indications: 'Asma aguda, crup, alergia severa', presentations: ['Solución 15mg/5mL', 'Comprimidos 5mg'], warnings: ['Preferible a prednisona en niños pequeños (líquido)'] },
    { name: 'Dexametasona', category: 'Corticoide', dosePerKg: 0.6, frequency: 'dosis única o cada 24h', maxDose: 16, unit: 'mg', indications: 'Crup, laringitis, edema cerebral, náuseas por QT', presentations: ['Ampollas 4mg/mL', 'Comprimidos 0.5mg', 'Comprimidos 4mg'], warnings: ['Muy potente', 'Vida media larga'] },
    { name: 'Metilprednisolona', category: 'Corticoide', dosePerKg: 2, frequency: 'cada 6h IV (pulsos)', maxDose: 1000, unit: 'mg', indications: 'Crisis asmática severa, enfermedades autoinmunes', presentations: ['Vial 40mg', 'Vial 125mg', 'Vial 500mg', 'Vial 1g'], warnings: ['Uso hospitalario', 'Arritmias con infusión rápida'] },
    { name: 'Hidrocortisona', category: 'Corticoide', dosePerKg: 4, frequency: 'cada 6-8h IV', maxDose: 300, unit: 'mg', indications: 'Insuficiencia suprarrenal, shock, anafilaxia', presentations: ['Vial 100mg', 'Vial 500mg'], warnings: ['Retención de sodio', 'Hipopotasemia'] },

    // ANTIÁCIDOS Y GASTROPROTECTORES
    { name: 'Omeprazol', category: 'IBP', dosePerKg: 1, frequency: 'cada 24h (antes desayuno)', maxDose: 40, unit: 'mg', indications: 'ERGE, úlcera péptica, gastritis', presentations: ['Cápsulas 10mg', 'Cápsulas 20mg', 'Sobres 10mg'], warnings: ['Hipomagnesemia (uso prolongado)', 'Infecciones GI'] },
    { name: 'Lansoprazol', category: 'IBP', dosePerKg: 0.7, frequency: 'cada 24h', maxDose: 30, unit: 'mg', indications: 'ERGE, úlcera péptica', presentations: ['Cápsulas 15mg', 'Cápsulas 30mg', 'Comprimidos bucodispersables'], warnings: ['Similar a omeprazol'] },
    { name: 'Ranitidina', category: 'Anti-H2', dosePerKg: 4, frequency: 'cada 12h', maxDose: 300, unit: 'mg', indications: 'ERGE, úlcera (alternativa a IBP)', presentations: ['Jarabe 75mg/5mL', 'Comprimidos 150mg', 'Comprimidos 300mg'], warnings: ['Retirada en algunos países por NDMA'] },
    { name: 'Sucralfato', category: 'Protector gástrico', dosePerKg: 40, frequency: 'cada 6h (antes comidas)', maxDose: 4000, unit: 'mg', indications: 'Úlcera péptica, gastritis erosiva', presentations: ['Suspensión 1g/5mL', 'Comprimidos 1g'], warnings: ['Interfiere absorción otros fármacos', 'Tomar separado'] },
    { name: 'Domperidona', category: 'Procinético', dosePerKg: 0.25, frequency: 'cada 8h', maxDose: 30, unit: 'mg', indications: 'Náuseas, vómitos, reflujo', presentations: ['Suspensión 5mg/5mL', 'Comprimidos 10mg'], warnings: ['Prolongación QT', 'Uso restringido'] },
    { name: 'Metoclopramida', category: 'Procinético', dosePerKg: 0.15, frequency: 'cada 8h', maxDose: 30, unit: 'mg', indications: 'Náuseas, vómitos, gastroparesia', presentations: ['Gotas 2.6mg/mL', 'Comprimidos 10mg', 'Ampollas 10mg/2mL'], warnings: ['Síntomas extrapiramidales', 'Uso limitado en niños'] },
    { name: 'Ondansetrón', category: 'Antiemético', dosePerKg: 0.15, frequency: 'cada 8h', maxDose: 24, unit: 'mg', indications: 'Náuseas y vómitos (QT, postoperatorio, gastroenteritis)', presentations: ['Comprimidos 4mg', 'Comprimidos 8mg', 'Ampollas 4mg/2mL', 'Comprimidos bucodispersables'], warnings: ['Prolongación QT', 'Estreñimiento'] },

    // ANTIDIARREICOS Y REHIDRATACIÓN
    { name: 'Suero de Rehidratación Oral', category: 'Rehidratación', dosePerKg: 75, frequency: 'en 4h (deshidratación leve)', maxDose: 0, unit: 'mL', indications: 'Deshidratación por gastroenteritis', presentations: ['Sobres para diluir en 1L', 'Solución lista'], warnings: ['Ajustar según grado deshidratación', 'Ofrecer frecuentemente'] },
    { name: 'Racecadotrilo', category: 'Antidiarreico', dosePerKg: 1.5, frequency: 'cada 8h', maxDose: 300, unit: 'mg', indications: 'Diarrea aguda (antisecretor)', presentations: ['Sobres 10mg', 'Sobres 30mg', 'Cápsulas 100mg'], warnings: ['Seguro en pediatría', 'No altera motilidad'] },
    { name: 'Probióticos (Lactobacillus)', category: 'Probiótico', dosePerKg: 0, frequency: 'según producto', maxDose: 0, unit: 'UFC', indications: 'Diarrea, prevención diarrea por antibióticos', presentations: ['Sobres', 'Gotas', 'Cápsulas'], warnings: ['Evitar en inmunodeprimidos graves'] },

    // ANTIPARASITARIOS
    { name: 'Mebendazol', category: 'Antiparasitario', dosePerKg: 0, frequency: '100mg cada 12h x 3 días', maxDose: 200, unit: 'mg/día', indications: 'Oxiuros, áscaris, uncinarias', presentations: ['Comprimidos 100mg', 'Suspensión 100mg/5mL'], warnings: ['Contraindicado <2 años', 'Puede repetir en 2 semanas'] },
    { name: 'Albendazol', category: 'Antiparasitario', dosePerKg: 7.5, frequency: 'cada 12h o 400mg dosis única', maxDose: 800, unit: 'mg', indications: 'Helmintiasis intestinal, Giardia, hidatidosis', presentations: ['Comprimidos 200mg', 'Comprimidos 400mg', 'Suspensión 100mg/5mL'], warnings: ['Contraindicado <2 años', 'Hepatotoxicidad (uso prolongado)'] },
    { name: 'Metronidazol (antiparasitario)', category: 'Antiparasitario', dosePerKg: 15, frequency: 'cada 8h x 7-10 días', maxDose: 2000, unit: 'mg', indications: 'Giardiasis, amebiasis', presentations: ['Suspensión 125mg/5mL', 'Comprimidos 250mg'], warnings: ['Sabor metálico', 'Efecto antabús'] },
    { name: 'Permetrina (tópica)', category: 'Antiparasitario', dosePerKg: 0, frequency: 'aplicar y lavar tras 10min (piojos) o 8-14h (sarna)', maxDose: 0, unit: 'aplicación', indications: 'Pediculosis, escabiosis', presentations: ['Loción 1%', 'Crema 5%'], warnings: ['Solo uso externo', 'Evitar ojos y mucosas'] },

    // ANTIEMÉTICOS
    { name: 'Dimenhidrinato', category: 'Antiemético', dosePerKg: 5, frequency: 'cada 6-8h', maxDose: 300, unit: 'mg', indications: 'Cinetosis, náuseas, vómitos', presentations: ['Comprimidos 50mg', 'Supositorios 25mg', 'Supositorios 50mg'], warnings: ['Sedación', 'Efectos anticolinérgicos', '>2 años'] },

    // ANTICONVULSIVANTES Y SEDANTES
    { name: 'Diazepam', category: 'Benzodiazepina', dosePerKg: 0.3, frequency: 'dosis única rectal/IV', maxDose: 10, unit: 'mg', indications: 'Crisis convulsiva, estatus epiléptico, sedación', presentations: ['Microenemas 5mg', 'Microenemas 10mg', 'Ampollas 10mg/2mL'], warnings: ['Depresión respiratoria', 'Monitorización', 'Equipo de reanimación'] },
    { name: 'Midazolam', category: 'Benzodiazepina', dosePerKg: 0.2, frequency: 'dosis única bucal/nasal/IV', maxDose: 10, unit: 'mg', indications: 'Crisis convulsiva, sedación procedimientos', presentations: ['Solución bucal 2.5mg/5mg/7.5mg/10mg', 'Ampollas 5mg/mL'], warnings: ['Depresión respiratoria', 'Amnesia anterógrada'] },
    { name: 'Fenobarbital', category: 'Antiepiléptico', dosePerKg: 5, frequency: 'cada 24h', maxDose: 300, unit: 'mg', indications: 'Epilepsia, convulsiones neonatales', presentations: ['Comprimidos 15mg', 'Comprimidos 100mg', 'Ampollas 200mg/mL'], warnings: ['Sedación', 'Inducción enzimática', 'Dependencia'] },
    { name: 'Ácido Valproico', category: 'Antiepiléptico', dosePerKg: 30, frequency: 'cada 8-12h', maxDose: 3000, unit: 'mg', indications: 'Epilepsia generalizada, crisis ausencia, migraña', presentations: ['Jarabe 200mg/5mL', 'Comprimidos 200mg', 'Comprimidos 500mg crono'], warnings: ['Hepatotoxicidad', 'Pancreatitis', 'Teratógeno'] },
    { name: 'Levetiracetam', category: 'Antiepiléptico', dosePerKg: 30, frequency: 'cada 12h', maxDose: 3000, unit: 'mg', indications: 'Epilepsia focal y generalizada', presentations: ['Solución 100mg/mL', 'Comprimidos 500mg', 'Comprimidos 1000mg'], warnings: ['Irritabilidad', 'Cambios conductuales'] },
    { name: 'Carbamazepina', category: 'Antiepiléptico', dosePerKg: 20, frequency: 'cada 8-12h', maxDose: 1200, unit: 'mg', indications: 'Epilepsia focal, neuralgia del trigémino', presentations: ['Suspensión 100mg/5mL', 'Comprimidos 200mg', 'Comprimidos 400mg retard'], warnings: ['Síndrome Stevens-Johnson (HLA-B*1502)', 'Hiponatremia', 'Inducción enzimática'] },

    // SUPLEMENTOS Y VITAMINAS
    { name: 'Hierro elemental', category: 'Suplemento', dosePerKg: 3, frequency: 'cada 24h', maxDose: 200, unit: 'mg Fe elemental', indications: 'Anemia ferropénica, profilaxis', presentations: ['Gotas sulfato ferroso', 'Jarabe gluconato ferroso', 'Comprimidos'], warnings: ['Tinción dental', 'Estreñimiento', 'Tomar con vitamina C'] },
    { name: 'Vitamina D (Colecalciferol)', category: 'Vitamina', dosePerKg: 0, frequency: '400-1000 UI/día', maxDose: 4000, unit: 'UI', indications: 'Prevención raquitismo, déficit vitamina D', presentations: ['Gotas 400 UI/gota', 'Gotas 2000 UI/mL', 'Ampollas 25000 UI'], warnings: ['Hipercalcemia en sobredosis', 'Monitorizar niveles'] },
    { name: 'Vitamina K (Fitomenadiona)', category: 'Vitamina', dosePerKg: 0, frequency: '1mg IM al nacer', maxDose: 10, unit: 'mg', indications: 'Profilaxis enfermedad hemorrágica del RN, intoxicación por anticoagulantes', presentations: ['Ampollas 2mg/0.2mL', 'Ampollas 10mg/mL'], warnings: ['Anafilaxia (IV rápida)', 'Preferir IM en neonatos'] },
    { name: 'Calcio (carbonato)', category: 'Suplemento', dosePerKg: 50, frequency: 'cada 8-12h', maxDose: 2500, unit: 'mg Ca elemental', indications: 'Hipocalcemia, suplementación', presentations: ['Comprimidos 500mg', 'Comprimidos masticables', 'Jarabe'], warnings: ['Estreñimiento', 'Interacciones medicamentosas'] },
    { name: 'Zinc', category: 'Suplemento', dosePerKg: 0, frequency: '10-20mg/día x 10-14 días', maxDose: 40, unit: 'mg', indications: 'Diarrea aguda (reduce duración)', presentations: ['Jarabe 20mg/5mL', 'Comprimidos dispersables 20mg'], warnings: ['Náuseas si se toma en ayunas'] }
];

let currentDrugSelection = null;

function initPediatricDosing() {
    renderPedDrugTable();
    populatePedDrugSelect();
}

function renderPedDrugTable() {
    const tbody = document.getElementById('ped-drug-table');
    if (!tbody) return;
    
    tbody.innerHTML = PEDIATRIC_DRUGS.map(drug => `
        <tr class="bg-white border-b hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">${drug.name}</td>
            <td class="px-4 py-3"><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${drug.category}</span></td>
            <td class="px-4 py-3">${drug.dosePerKg > 0 ? drug.dosePerKg + ' ' + drug.unit + '/kg/día' : 'Ver posología'}</td>
            <td class="px-4 py-3">${drug.frequency}</td>
            <td class="px-4 py-3">${drug.maxDose > 0 ? drug.maxDose + ' ' + drug.unit : '-'}</td>
        </tr>
    `).join('');
}

function populatePedDrugSelect(filterText = '') {
    const select = document.getElementById('ped-drug-select');
    if (!select) return;
    
    const filtered = filterText 
        ? PEDIATRIC_DRUGS.filter(d => d.name.toLowerCase().includes(filterText.toLowerCase()) || d.category.toLowerCase().includes(filterText.toLowerCase()))
        : PEDIATRIC_DRUGS;
    
    select.innerHTML = '<option value="">Seleccionar medicamento...</option>' + 
        filtered.map((drug, idx) => `<option value="${PEDIATRIC_DRUGS.indexOf(drug)}">${drug.name} (${drug.category})</option>`).join('');
}

window.filterPedDrugs = function() {
    const search = document.getElementById('ped-drug-search').value;
    populatePedDrugSelect(search);
}

window.selectPedDrug = function() {
    const select = document.getElementById('ped-drug-select');
    const idx = parseInt(select.value);
    if (!isNaN(idx) && PEDIATRIC_DRUGS[idx]) {
        currentDrugSelection = PEDIATRIC_DRUGS[idx];
    } else {
        currentDrugSelection = null;
    }
}

window.calculatePedDose = function() {
    const weight = parseFloat(document.getElementById('ped-weight').value);
    const ageYears = parseInt(document.getElementById('ped-age-years').value) || 0;
    const ageMonths = parseInt(document.getElementById('ped-age-months').value) || 0;
    
    if (!weight || weight <= 0) {
        showToast('Por favor ingresa el peso del paciente', 'error');
        return;
    }
    
    if (!currentDrugSelection) {
        showToast('Por favor selecciona un medicamento', 'error');
        return;
    }
    
    const drug = currentDrugSelection;
    const resultDiv = document.getElementById('ped-result');
    const noResultDiv = document.getElementById('ped-no-result');
    
    // Calculate doses
    let dailyDose = drug.dosePerKg * weight;
    if (drug.maxDose > 0 && dailyDose > drug.maxDose) {
        dailyDose = drug.maxDose;
    }
    
    // Determine frequency divisor
    let freqDivisor = 1;
    if (drug.frequency.includes('cada 4h')) freqDivisor = 6;
    else if (drug.frequency.includes('cada 6h')) freqDivisor = 4;
    else if (drug.frequency.includes('cada 8h')) freqDivisor = 3;
    else if (drug.frequency.includes('cada 12h')) freqDivisor = 2;
    else if (drug.frequency.includes('cada 24h')) freqDivisor = 1;
    
    const dosePerAdmin = dailyDose / freqDivisor;
    
    // Update UI
    document.getElementById('ped-result-drug').textContent = drug.name;
    document.getElementById('ped-result-indication').textContent = drug.indications;
    document.getElementById('ped-result-dose').textContent = drug.dosePerKg > 0 ? `${dosePerAdmin.toFixed(1)} ${drug.unit}` : 'Ver posología específica';
    document.getElementById('ped-result-daily').textContent = drug.dosePerKg > 0 ? `${dailyDose.toFixed(1)} ${drug.unit}/día` : 'Variable';
    document.getElementById('ped-result-posology').textContent = `Administrar ${drug.frequency}. Peso: ${weight} kg, Edad: ${ageYears}a ${ageMonths}m`;
    
    // Warnings
    const warningsUl = document.getElementById('ped-result-warnings');
    warningsUl.innerHTML = drug.warnings.map(w => `<li>${w}</li>`).join('');
    
    // Presentations
    const presDiv = document.getElementById('ped-result-presentations');
    presDiv.innerHTML = drug.presentations.map(p => `<span class="inline-block bg-gray-200 rounded px-2 py-1 text-xs mr-2 mb-2">${p}</span>`).join('');
    
    resultDiv.classList.remove('hidden');
    noResultDiv.classList.add('hidden');
}

// ===== IMC CALCULATOR =====
window.calculateIMC = function() {
    const weight = parseFloat(document.getElementById('imc-weight').value);
    const height = parseFloat(document.getElementById('imc-height').value);
    
    if (!weight || !height || weight <= 0 || height <= 0) {
        showToast('Por favor ingresa peso y altura válidos', 'error');
        return;
    }
    
    const heightM = height / 100;
    const imc = weight / (heightM * heightM);
    
    let category = '';
    let categoryClass = '';
    
    if (imc < 18.5) {
        category = 'Bajo peso';
        categoryClass = 'text-blue-600';
    } else if (imc < 25) {
        category = 'Peso normal';
        categoryClass = 'text-green-600';
    } else if (imc < 30) {
        category = 'Sobrepeso';
        categoryClass = 'text-yellow-600';
    } else if (imc < 35) {
        category = 'Obesidad grado I';
        categoryClass = 'text-orange-600';
    } else if (imc < 40) {
        category = 'Obesidad grado II';
        categoryClass = 'text-red-600';
    } else {
        category = 'Obesidad grado III (mórbida)';
        categoryClass = 'text-red-800';
    }
    
    document.getElementById('imc-value').textContent = imc.toFixed(1);
    document.getElementById('imc-value').className = `text-5xl font-bold ${categoryClass}`;
    document.getElementById('imc-category').textContent = category;
    document.getElementById('imc-category').className = `text-lg ${categoryClass}`;
    document.getElementById('imc-result').classList.remove('hidden');
}

// ===== CREATININE CLEARANCE CALCULATOR =====
window.calculateClearance = function() {
    const age = parseFloat(document.getElementById('clcr-age').value);
    const weight = parseFloat(document.getElementById('clcr-weight').value);
    const creatinine = parseFloat(document.getElementById('clcr-creatinine').value);
    const sex = document.getElementById('clcr-sex').value;
    
    if (!age || !weight || !creatinine || age <= 0 || weight <= 0 || creatinine <= 0) {
        showToast('Por favor completa todos los campos correctamente', 'error');
        return;
    }
    
    // Cockcroft-Gault formula
    let clCr = ((140 - age) * weight) / (72 * creatinine);
    if (sex === 'female') {
        clCr *= 0.85;
    }
    
    // Determine CKD stage
    let stage = '';
    if (clCr >= 90) {
        stage = 'G1 - Normal';
    } else if (clCr >= 60) {
        stage = 'G2 - Leve ↓';
    } else if (clCr >= 45) {
        stage = 'G3a - Leve-Mod';
    } else if (clCr >= 30) {
        stage = 'G3b - Mod-Grave';
    } else if (clCr >= 15) {
        stage = 'G4 - Grave ↓';
    } else {
        stage = 'G5 - Fallo renal';
    }
    
    document.getElementById('clcr-cg').textContent = clCr.toFixed(1);
    document.getElementById('clcr-stage').textContent = stage;
    document.getElementById('clcr-result').classList.remove('hidden');
}
