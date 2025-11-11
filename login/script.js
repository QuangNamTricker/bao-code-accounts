import { auth, db } from '../../firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// DOM Elements
const loginToggle = document.getElementById('login-toggle');
const signupToggle = document.getElementById('signup-toggle');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const messageDiv = document.getElementById('message');

// Toggle between login and signup forms
loginToggle.addEventListener('click', () => {
    loginToggle.classList.add('active');
    signupToggle.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    clearMessage();
});

signupToggle.addEventListener('click', () => {
    signupToggle.classList.add('active');
    loginToggle.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    clearMessage();
});

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            this.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            this.textContent = '👁️';
        }
    });
});

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        showMessage('Đăng nhập thành công!', 'success');
        
        // Redirect to dashboard after successful login
        setTimeout(() => {
            window.location.href = '../trangchu/index.html';
        }, 1000);
        
    } catch (error) {
        let errorMessage = 'Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Email không hợp lệ.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Tài khoản đã bị vô hiệu hóa.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'Không tìm thấy tài khoản với email này.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Mật khẩu không chính xác.';
                break;
            default:
                errorMessage = error.message;
        }
        
        showMessage(errorMessage, 'error');
    }
});

// Handle signup form submission
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Client-side validation
    if (password !== confirmPassword) {
        showMessage('Mật khẩu xác nhận không khớp.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        showMessage('Đăng ký thành công! Đang chuyển hướng...', 'success');
        
        // Redirect to dashboard after successful signup
        setTimeout(() => {
            window.location.href = '../trangchu/index.html';
        }, 1500);
        
    } catch (error) {
        let errorMessage = 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email này đã được sử dụng.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email không hợp lệ.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Hoạt động này hiện không được cho phép.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Mật khẩu quá yếu.';
                break;
            default:
                errorMessage = error.message;
        }
        
        showMessage(errorMessage, 'error');
    }
});

// Helper functions
function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
}

function clearMessage() {
    messageDiv.textContent = '';
    messageDiv.className = 'message';
}