import { auth, db } from '../../firebase-config.js';
import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// DOM Elements
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const addAccountForm = document.getElementById('add-account-form');
const loadingDiv = document.getElementById('loading');
const editModal = document.getElementById('edit-modal');
const closeModal = document.querySelector('.close');
const cancelEditBtn = document.getElementById('cancel-edit');
const editAccountForm = document.getElementById('edit-account-form');
const notificationDiv = document.getElementById('notification');
const urlGroupsContainer = document.getElementById('url-groups-container');
const summaryStats = document.getElementById('summary-stats');

// Filter elements
const urlFilter = document.getElementById('url-filter');
const searchAccount = document.getElementById('search-account');
const balanceFilter = document.getElementById('balance-filter');
const codeFilter = document.getElementById('code-filter');
const phoneFilter = document.getElementById('phone-filter');
const resetFiltersBtn = document.getElementById('reset-filters');
const expandAllBtn = document.getElementById('expand-all');
const collapseAllBtn = document.getElementById('collapse-all');

// State
let currentUser = null;
let accounts = [];
let editingAccountId = null;
let filteredAccounts = [];
let urlGroups = new Map();
let expandedGroups = new Set();

// Filter state
let currentFilters = {
    url: '',
    search: '',
    balance: 'all',
    code: 'all',
    phone: 'all'
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            userEmailSpan.textContent = user.email;
            loadAccounts();
            setupEventListeners();
        } else {
            // Redirect to login if not authenticated
            window.location.href = '../login/index.html';
        }
    });
});

// Setup event listeners for filters
function setupEventListeners() {
    // Filter events
    urlFilter.addEventListener('change', (e) => {
        currentFilters.url = e.target.value;
        applyFilters();
    });
    
    searchAccount.addEventListener('input', (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        applyFilters();
    });
    
    balanceFilter.addEventListener('change', (e) => {
        currentFilters.balance = e.target.value;
        applyFilters();
    });
    
    codeFilter.addEventListener('change', (e) => {
        currentFilters.code = e.target.value;
        applyFilters();
    });
    
    phoneFilter.addEventListener('change', (e) => {
        currentFilters.phone = e.target.value;
        applyFilters();
    });
    
    resetFiltersBtn.addEventListener('click', resetFilters);
    expandAllBtn.addEventListener('click', expandAllGroups);
    collapseAllBtn.addEventListener('click', collapseAllGroups);
}

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showNotification('Đã đăng xuất thành công', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Lỗi khi đăng xuất', 'error');
    }
});

// Toggle password visibility
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-password')) {
        const targetId = e.target.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            e.target.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            e.target.textContent = '👁️';
        }
    }
});

// Add new account
addAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const accountData = {
        url: document.getElementById('url').value,
        username: document.getElementById('username').value,
        phone: document.getElementById('phone').value || '',
        password: document.getElementById('password').value,
        phoneVerified: document.getElementById('phone-verified').checked,
        codeRequested: document.getElementById('code-requested').checked,
        balance: parseFloat(document.getElementById('balance').value) || 0,
        notes: document.getElementById('notes').value || '',
        createdAt: new Date()
    };
    
    try {
        const accountsRef = collection(db, 'users', currentUser.uid, 'accounts');
        await addDoc(accountsRef, accountData);
        
        addAccountForm.reset();
        showNotification('Đã thêm tài khoản thành công!', 'success');
    } catch (error) {
        console.error('Error adding account:', error);
        showNotification('Lỗi khi thêm tài khoản', 'error');
    }
});

// Load accounts from Firestore
function loadAccounts() {
    loadingDiv.style.display = 'block';
    
    const accountsRef = collection(db, 'users', currentUser.uid, 'accounts');
    const q = query(accountsRef);
    
    // Real-time listener
    onSnapshot(q, (querySnapshot) => {
        accounts = [];
        
        querySnapshot.forEach((doc) => {
            const account = {
                id: doc.id,
                ...doc.data()
            };
            accounts.push(account);
        });
        
        processAccounts();
        loadingDiv.style.display = 'none';
        
    }, (error) => {
        console.error('Error loading accounts:', error);
        loadingDiv.textContent = 'Lỗi khi tải dữ liệu. Vui lòng thử lại.';
        showNotification('Lỗi khi tải dữ liệu', 'error');
    });
}

// Process accounts data
function processAccounts() {
    // Group accounts by URL
    urlGroups.clear();
    
    accounts.forEach(account => {
        const url = account.url || 'Không có URL';
        if (!urlGroups.has(url)) {
            urlGroups.set(url, []);
        }
        urlGroups.get(url).push(account);
    });
    
    // Update URL filter options
    updateUrlFilter();
    
    // Apply current filters
    applyFilters();
    
    // Update summary statistics
    updateSummaryStats();
}

// Update URL filter dropdown
function updateUrlFilter() {
    const currentValue = urlFilter.value;
    urlFilter.innerHTML = '<option value="">Tất cả URL</option>';
    
    const urls = Array.from(urlGroups.keys()).sort();
    urls.forEach(url => {
        const option = document.createElement('option');
        option.value = url;
        option.textContent = url;
        urlFilter.appendChild(option);
    });
    
    // Restore previous selection if still valid
    if (urls.includes(currentValue)) {
        urlFilter.value = currentValue;
    }
}

// Apply filters to accounts
function applyFilters() {
    filteredAccounts = accounts.filter(account => {
        // URL filter
        if (currentFilters.url && account.url !== currentFilters.url) {
            return false;
        }
        
        // Search filter
        if (currentFilters.search && 
            !account.username.toLowerCase().includes(currentFilters.search) &&
            !account.phone.includes(currentFilters.search)) {
            return false;
        }
        
        // Balance filter
        if (currentFilters.balance === 'has-money' && account.balance <= 0) {
            return false;
        }
        if (currentFilters.balance === 'no-money' && account.balance > 0) {
            return false;
        }
        
        // Code filter
        if (currentFilters.code === 'requested' && !account.codeRequested) {
            return false;
        }
        if (currentFilters.code === 'not-requested' && account.codeRequested) {
            return false;
        }
        
        // Phone filter
        if (currentFilters.phone === 'verified' && !account.phoneVerified) {
            return false;
        }
        if (currentFilters.phone === 'not-verified' && account.phoneVerified) {
            return false;
        }
        
        return true;
    });
    
    renderUrlGroups();
    updateSummaryStats();
}

// Reset all filters
function resetFilters() {
    currentFilters = {
        url: '',
        search: '',
        balance: 'all',
        code: 'all',
        phone: 'all'
    };
    
    urlFilter.value = '';
    searchAccount.value = '';
    balanceFilter.value = 'all';
    codeFilter.value = 'all';
    phoneFilter.value = 'all';
    
    applyFilters();
}

// Render URL groups
function renderUrlGroups() {
    const filteredGroups = new Map();
    
    // Group filtered accounts by URL
    filteredAccounts.forEach(account => {
        const url = account.url || 'Không có URL';
        if (!filteredGroups.has(url)) {
            filteredGroups.set(url, []);
        }
        filteredGroups.get(url).push(account);
    });
    
    urlGroupsContainer.innerHTML = '';
    
    if (filteredGroups.size === 0) {
        urlGroupsContainer.innerHTML = `
            <div class="empty-state">
                <div>📭</div>
                <h3>Không tìm thấy tài khoản nào</h3>
                <p>Thử thay đổi bộ lọc hoặc thêm tài khoản mới</p>
            </div>
        `;
        return;
    }
    
    // Convert to array and sort by URL
    const sortedGroups = Array.from(filteredGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    sortedGroups.forEach(([url, groupAccounts]) => {
        const groupElement = createUrlGroupElement(url, groupAccounts);
        urlGroupsContainer.appendChild(groupElement);
    });
}

// Create URL group element
function createUrlGroupElement(url, groupAccounts) {
    const groupDiv = document.createElement('div');
    groupDiv.className = `url-group ${expandedGroups.has(url) ? 'expanded' : ''}`;
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'url-group-header';
    headerDiv.innerHTML = `
        <div class="url-group-title">${url}</div>
        <div class="url-group-count">${groupAccounts.length} tài khoản</div>
    `;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'url-group-content';
    
    const table = document.createElement('table');
    table.className = 'url-group-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Tài khoản</th>
                <th>SĐT</th>
                <th>Mật khẩu</th>
                <th>Xác thực SĐT</th>
                <th>Xin code</th>
                <th>Số dư</th>
                <th>Ghi chú</th>
                <th>Hành động</th>
            </tr>
        </thead>
        <tbody>
            ${groupAccounts.map(account => `
                <tr>
                    <td>
                        <div class="username-cell">
                            <strong>${account.username}</strong>
                            <button class="quick-action-btn quick-copy" data-value="${account.username}" title="Copy tài khoản">
                                📋
                            </button>
                        </div>
                    </td>
                    <td>${account.phone || ''}</td>
                    <td class="password-cell">
                        <span class="hidden-password">${'•'.repeat(account.password.length)}</span>
                        <button class="toggle-password-btn" data-password="${account.password}">👁️</button>
                        <button class="quick-action-btn quick-copy" data-value="${account.password}" title="Copy mật khẩu">
                            📋
                        </button>
                    </td>
                    <td>
                        <span class="badge ${account.phoneVerified ? 'success' : 'danger'}">
                            ${account.phoneVerified ? '✅ Đã xác thực' : '❌ Chưa xác thực'}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${account.codeRequested ? 'success' : 'warning'}">
                            ${account.codeRequested ? '✅ Đã xin' : '❌ Chưa xin'}
                        </span>
                    </td>
                    <td class="${account.balance > 0 ? 'balance-positive' : 'balance-zero'}">
                        ${account.balance ? account.balance.toLocaleString() : '0'}
                    </td>
                    <td>${account.notes || ''}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" data-id="${account.id}">Sửa</button>
                        <button class="delete-btn" data-id="${account.id}">Xóa</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    contentDiv.appendChild(table);
    groupDiv.appendChild(headerDiv);
    groupDiv.appendChild(contentDiv);
    
    // Toggle expand/collapse
    headerDiv.addEventListener('click', () => {
        toggleGroupExpansion(url, groupDiv);
    });
    
    // Add event listeners for buttons in this group
    setTimeout(() => {
        addGroupEventListeners(groupDiv);
    }, 0);
    
    return groupDiv;
}

// Toggle group expansion
function toggleGroupExpansion(url, groupElement) {
    if (expandedGroups.has(url)) {
        expandedGroups.delete(url);
        groupElement.classList.remove('expanded');
    } else {
        expandedGroups.add(url);
        groupElement.classList.add('expanded');
    }
}

// Expand all groups
function expandAllGroups() {
    expandedGroups.clear();
    document.querySelectorAll('.url-group').forEach(group => {
        const url = group.querySelector('.url-group-title').textContent;
        expandedGroups.add(url);
        group.classList.add('expanded');
    });
}

// Collapse all groups
function collapseAllGroups() {
    expandedGroups.clear();
    document.querySelectorAll('.url-group').forEach(group => {
        group.classList.remove('expanded');
    });
}

// Add event listeners for elements in a group
function addGroupEventListeners(groupElement) {
    // Password toggles
    groupElement.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const passwordSpan = this.previousElementSibling;
            if (passwordSpan.classList.contains('hidden-password')) {
                passwordSpan.textContent = this.getAttribute('data-password');
                passwordSpan.classList.remove('hidden-password');
                this.textContent = '🙈';
            } else {
                const passwordLength = this.getAttribute('data-password').length;
                passwordSpan.textContent = '•'.repeat(passwordLength);
                passwordSpan.classList.add('hidden-password');
                this.textContent = '👁️';
            }
        });
    });
    
    // Copy buttons
    groupElement.querySelectorAll('.quick-copy').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            navigator.clipboard.writeText(value).then(() => {
                showNotification('Đã copy vào clipboard!', 'success');
            });
        });
    });
    
    // Edit buttons
    groupElement.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const accountId = this.getAttribute('data-id');
            openEditModal(accountId);
        });
    });
    
    // Delete buttons
    groupElement.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const accountId = this.getAttribute('data-id');
            deleteAccount(accountId);
        });
    });
}

// Update summary statistics
function updateSummaryStats() {
    const totalAccounts = filteredAccounts.length;
    const accountsWithMoney = filteredAccounts.filter(acc => acc.balance > 0).length;
    const accountsWithCode = filteredAccounts.filter(acc => acc.codeRequested).length;
    const accountsWithPhoneVerified = filteredAccounts.filter(acc => acc.phoneVerified).length;
    const totalBalance = filteredAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    
    summaryStats.innerHTML = `
        <div class="stat-item">
            <div class="count">${totalAccounts}</div>
            <div>Tổng tài khoản</div>
        </div>
        <div class="stat-item">
            <div class="count">${accountsWithMoney}</div>
            <div>Tài khoản có tiền</div>
        </div>
        <div class="stat-item">
            <div class="count">${accountsWithCode}</div>
            <div>Đã xin code</div>
        </div>
        <div class="stat-item">
            <div class="count">${accountsWithPhoneVerified}</div>
            <div>Đã xác thực SĐT</div>
        </div>
        <div class="stat-item">
            <div class="count">${totalBalance.toLocaleString()}</div>
            <div>Tổng số dư</div>
        </div>
    `;
}

// Open edit modal
function openEditModal(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    editingAccountId = accountId;
    
    // Fill form with account data
    document.getElementById('edit-id').value = account.id;
    document.getElementById('edit-url').value = account.url;
    document.getElementById('edit-username').value = account.username;
    document.getElementById('edit-phone').value = account.phone;
    document.getElementById('edit-password').value = account.password;
    document.getElementById('edit-phone-verified').checked = account.phoneVerified;
    document.getElementById('edit-code-requested').checked = account.codeRequested;
    document.getElementById('edit-balance').value = account.balance || '';
    document.getElementById('edit-notes').value = account.notes || '';
    
    // Show modal
    editModal.style.display = 'block';
}

// Close edit modal
function closeEditModal() {
    editModal.style.display = 'none';
    editingAccountId = null;
    editAccountForm.reset();
}

// Event listeners for modal
closeModal.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

// Update account
editAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const accountData = {
        url: document.getElementById('edit-url').value,
        username: document.getElementById('edit-username').value,
        phone: document.getElementById('edit-phone').value || '',
        password: document.getElementById('edit-password').value,
        phoneVerified: document.getElementById('edit-phone-verified').checked,
        codeRequested: document.getElementById('edit-code-requested').checked,
        balance: parseFloat(document.getElementById('edit-balance').value) || 0,
        notes: document.getElementById('edit-notes').value || '',
        updatedAt: new Date()
    };
    
    try {
        const accountRef = doc(db, 'users', currentUser.uid, 'accounts', editingAccountId);
        await updateDoc(accountRef, accountData);
        
        closeEditModal();
        showNotification('Đã cập nhật tài khoản thành công!', 'success');
    } catch (error) {
        console.error('Error updating account:', error);
        showNotification('Lỗi khi cập nhật tài khoản', 'error');
    }
});

// Delete account
async function deleteAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa tài khoản "${account.username}" cho "${account.url}"?`);
    
    if (confirmDelete) {
        try {
            const accountRef = doc(db, 'users', currentUser.uid, 'accounts', accountId);
            await deleteDoc(accountRef);
            showNotification('Đã xóa tài khoản thành công!', 'success');
        } catch (error) {
            console.error('Error deleting account:', error);
            showNotification('Lỗi khi xóa tài khoản', 'error');
        }
    }
}

// Show notification
function showNotification(message, type) {
    notificationDiv.textContent = message;
    notificationDiv.className = `notification ${type}`;
    notificationDiv.style.display = 'block';
    
    setTimeout(() => {
        notificationDiv.style.display = 'none';
    }, 3000);
}