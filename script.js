/**
 * Digital Noticeboard Application
 * Enhanced version with improved accessibility, error handling, and UX
 */

// Backend API base URL (dynamic to support mobile on local network)
// If the page is opened via file://, fall back to localhost.
// Allow manual override via localStorage('API_BASE') or window.API_BASE.
const API_BASE = (() => {
  const DEFAULT = 'http://127.0.0.1:5000/api';
  const override = (typeof window !== 'undefined' && (window.API_BASE || localStorage.getItem('API_BASE'))) || null;
  if (override && typeof override === 'string') {
    return override.replace(/\/$/, '');
  }
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    const host = location.hostname || '127.0.0.1';
    return `${location.protocol}//${host}:5000/api`;
  }
  return DEFAULT;
})();

// Application state
const AppState = {
  notices: [],
  isAdminLoggedIn: false,
  editingNoticeId: null,
  currentView: 'student',
  // Prefer long-lived token; fall back to session
  authToken: localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null,
  // Track a chosen image from the media library (filename stored on server)
  selectedImageFilename: null,
};

// Utility functions
const Utils = {
  // Sanitize input to prevent XSS
  sanitizeInput: (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  // Show toast notification
  showToast: (message, type = 'info', duration = 3000) => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="flex items-center">
        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
        <span>${message}</span>
      </div>
    `;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
    container.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Hide toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Validate form input
  validateInput: (value, type, minLength = 1, maxLength = 1000) => {
    if (!value || value.trim().length < minLength) {
      return `This field is required and must be at least ${minLength} characters long.`;
    }
    if (value.length > maxLength) {
      return `This field must be no more than ${maxLength} characters long.`;
    }
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address.';
    }
    return null;
  },

  // Show loading state
  showLoading: (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('loading');
    }
  },

  // Hide loading state
  hideLoading: (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove('loading');
    }
  },

  // Format date for display
  formatDate: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },
};

// UI Elements - Cache DOM elements for better performance
const Elements = {
  // Navigation
  studentBtn: document.getElementById('student-btn'),
  adminBtn: document.getElementById('admin-btn'),
  roleSelector: document.getElementById('role-selector'),
  logoutBtn: document.getElementById('logout-btn'),

  // Views
  studentView: document.getElementById('student-view'),
  adminLogin: document.getElementById('admin-login'),
  adminDashboard: document.getElementById('admin-dashboard'),

  // Forms
  loginForm: document.getElementById('login-form'),
  noticeForm: document.getElementById('notice-form'),

  // Notice management
  noticesList: document.getElementById('notices-list'),
  studentNotices: document.getElementById('student-notices'),
  newNoticeBtn: document.getElementById('new-notice-btn'),

  // Scroll controls
  scrollLeft: document.getElementById('scroll-left'),
  scrollRight: document.getElementById('scroll-right'),

  // Modal
  noticeModal: document.getElementById('notice-modal'),
  closeModal: document.getElementById('close-modal'),
  modalTitle: document.getElementById('modal-title'),


  // Loading states
  noticesLoading: document.getElementById('notices-loading'),
  studentNoticesLoading: document.getElementById('student-notices-loading'),
  noNotices: document.getElementById('no-notices'),
  noStudentNotices: document.getElementById('no-student-notices'),

  // Form inputs
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  noticeTitle: document.getElementById('notice-title'),
  noticeDescription: document.getElementById('notice-description'),
  // noticeDate removed
  noticeFile: document.getElementById('notice-file'),
  descriptionCount: document.getElementById('description-count'),

  // Image helpers
  imageDropzone: document.getElementById('image-dropzone'),
  imageInfoWrap: document.getElementById('image-info-wrap'),
  selectedImageName: document.getElementById('selected-image-name'),
  clearImage: document.getElementById('clear-image'),

  // Media library
  openMediaLibrary: document.getElementById('open-media-library'),
  mediaModal: document.getElementById('media-modal'),
  closeMediaModal: document.getElementById('close-media-modal'),
  mediaGrid: document.getElementById('media-grid'),
  mediaLoading: document.getElementById('media-loading'),
  mediaEmpty: document.getElementById('media-empty'),

  // Image lightbox
  imageLightbox: document.getElementById('image-lightbox'),
  lightboxImg: document.getElementById('lightbox-img'),
  lightboxClose: document.getElementById('lightbox-close'),

  // Buttons
  loginSubmit: document.getElementById('login-submit'),
  saveNoticeBtn: document.getElementById('save-notice-btn'),
  registerBtn: document.getElementById('register-btn'),
  togglePassword: document.getElementById('toggle-password'),
  rememberMe: document.getElementById('remember-me'),

  // Register modal elements
  registerModal: document.getElementById('register-modal'),
  closeRegisterModal: document.getElementById('close-register-modal'),
  registerForm: document.getElementById('register-form'),
  regUsername: document.getElementById('reg-username'),
  regPassword: document.getElementById('reg-password'),
  registerSubmit: document.getElementById('register-submit'),
};

// Application functions
const App = {
  // Initialize the application
  init: () => {
    App.setupEventListeners();
    App.showStudentView();
    Utils.showToast('Welcome to Digital Noticeboard!', 'success');
    // If token exists, consider admin auth available for write actions
    if (AppState.authToken) {
      AppState.isAdminLoggedIn = true;
    }
  },

  // Setup all event listeners
  setupEventListeners: () => {
    // Role switching with keyboard support
    if (Elements.studentBtn) Elements.studentBtn.addEventListener('click', App.showStudentView);
    if (Elements.adminBtn) Elements.adminBtn.addEventListener('click', App.showAdminView);

    // Keyboard navigation for role selector
    if (Elements.roleSelector) Elements.roleSelector.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentActive = Elements.roleSelector.querySelector('.active');
        const buttons = Elements.roleSelector.querySelectorAll('button');
        const currentIndex = Array.from(buttons).indexOf(currentActive);

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          buttons[currentIndex - 1].click();
        } else if (e.key === 'ArrowRight' && currentIndex < buttons.length - 1) {
          buttons[currentIndex + 1].click();
        }
      }
    });

    // Login form
    if (Elements.loginForm) Elements.loginForm.addEventListener('submit', App.handleLogin);

    // Notice form
    if (Elements.noticeForm) Elements.noticeForm.addEventListener('submit', App.handleNoticeSubmit);

    // Modal controls
    if (Elements.closeModal) Elements.closeModal.addEventListener('click', App.closeModal);
    if (Elements.newNoticeBtn) Elements.newNoticeBtn.addEventListener('click', App.openNewNoticeModal);

    // Scroll controls
    if (Elements.scrollLeft) Elements.scrollLeft.addEventListener('click', App.scrollLeft);
    if (Elements.scrollRight) Elements.scrollRight.addEventListener('click', App.scrollRight);


    // Logout
    if (Elements.logoutBtn) Elements.logoutBtn.addEventListener('click', App.logout);

    // Password visibility toggle
    if (Elements.togglePassword) {
      Elements.togglePassword.addEventListener('click', () => {
        const input = Elements.password;
        if (!input) return;
        const isPassword = input.getAttribute('type') === 'password';
        input.setAttribute('type', isPassword ? 'text' : 'password');
        const icon = Elements.togglePassword.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-eye', !isPassword);
          icon.classList.toggle('bi-eye-slash', isPassword);
        }
        Elements.togglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      });
    }

    // Registration modal
    if (Elements.registerBtn) Elements.registerBtn.addEventListener('click', () => {
      if (Elements.registerModal) {
        Elements.registerModal.style.display = 'flex';
        Elements.registerModal.setAttribute('aria-hidden', 'false');
        if (Elements.regUsername) Elements.regUsername.focus();
      }
    });
    if (Elements.closeRegisterModal) Elements.closeRegisterModal.addEventListener('click', () => {
      if (Elements.registerModal) {
        Elements.registerModal.style.display = 'none';
        Elements.registerModal.setAttribute('aria-hidden', 'true');
      }
    });
    if (Elements.registerModal) Elements.registerModal.addEventListener('click', (e) => {
      if (e.target === Elements.registerModal) {
        Elements.registerModal.style.display = 'none';
        Elements.registerModal.setAttribute('aria-hidden', 'true');
      }
    });
    if (Elements.registerForm) Elements.registerForm.addEventListener('submit', App.handleRegister);

    // Character counter for description
    if (Elements.noticeDescription) Elements.noticeDescription.addEventListener('input', App.updateCharacterCount);

    // Image input filename display
    if (Elements.noticeFile) Elements.noticeFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        // Clear any selected image from library if a new file is chosen
        AppState.selectedImageFilename = null;
        if (Elements.selectedImageName) Elements.selectedImageName.textContent = file.name;
        if (Elements.imageInfoWrap) Elements.imageInfoWrap.classList.remove('hidden');
      } else {
        App.clearSelectedImage();
      }
    });

    // Dropzone drag/drop
    if (Elements.imageDropzone) {
      ['dragenter','dragover'].forEach(evt => Elements.imageDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        Elements.imageDropzone.classList.add('dragover');
      }));
      ;['dragleave','drop'].forEach(evt => Elements.imageDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (evt === 'dragleave') Elements.imageDropzone.classList.remove('dragover');
      }));
      Elements.imageDropzone.addEventListener('drop', (e) => {
        Elements.imageDropzone.classList.remove('dragover');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) {
          Elements.noticeFile.files = dt.files;
          const changeEvent = new Event('change');
          Elements.noticeFile.dispatchEvent(changeEvent);
        }
      });
      // Keyboard activate to open file input
      Elements.imageDropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          Elements.noticeFile && Elements.noticeFile.click();
        }
      });
    }

    // Clear image button
    if (Elements.clearImage) Elements.clearImage.addEventListener('click', () => {
      App.clearSelectedImage();
    });

    // Media library events
    if (Elements.openMediaLibrary) Elements.openMediaLibrary.addEventListener('click', App.openMediaLibrary);
    if (Elements.closeMediaModal) Elements.closeMediaModal.addEventListener('click', App.closeMediaModal);
    if (Elements.mediaModal) Elements.mediaModal.addEventListener('click', (e) => {
      if (e.target === Elements.mediaModal) App.closeMediaModal();
    });

    // Modal close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (Elements.noticeModal && Elements.noticeModal.style.display === 'flex') {
          App.closeModal();
        }
        if (Elements.imageLightbox && Elements.imageLightbox.classList.contains('open')) {
          App.closeImageLightbox();
        }
      }
    });

    // Modal close on backdrop click
    if (Elements.noticeModal) Elements.noticeModal.addEventListener('click', (e) => {
      if (e.target === Elements.noticeModal) {
        App.closeModal();
      }
    });

    // Lightbox events
    if (Elements.lightboxClose) Elements.lightboxClose.addEventListener('click', App.closeImageLightbox);
    if (Elements.imageLightbox) Elements.imageLightbox.addEventListener('click', (e) => {
      if (e.target === Elements.imageLightbox) App.closeImageLightbox();
    });
  },

  // Debounce function for search
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Image Lightbox
  openImageLightbox: (src, alt = 'Full-size notice image') => {
    if (!Elements.imageLightbox || !Elements.lightboxImg) return;
    Elements.lightboxImg.src = src;
    Elements.lightboxImg.alt = alt;
    Elements.imageLightbox.classList.add('open');
    Elements.imageLightbox.setAttribute('aria-hidden', 'false');
    try { document.body.style.overflow = 'hidden'; } catch {}
  },

  closeImageLightbox: () => {
    if (!Elements.imageLightbox || !Elements.lightboxImg) return;
    Elements.imageLightbox.classList.remove('open');
    Elements.imageLightbox.setAttribute('aria-hidden', 'true');
    Elements.lightboxImg.src = '';
    try { document.body.style.overflow = ''; } catch {}
  },

  // API helpers
  api: {
    async listNotices() {
      const res = await fetch(`${API_BASE}/notices`);
      if (!res.ok) throw new Error('Failed to fetch notices');
      return res.json();
    },
    async getNotice(id) {
      const res = await fetch(`${API_BASE}/notices/${id}`);
      if (!res.ok) throw new Error('Failed to fetch notice');
      return res.json();
    },
    async createNotice(payload) {
      const res = await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AppState.authToken ? { 'Authorization': `Bearer ${AppState.authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create notice');
      }
      return res.json();
    },
    async updateNotice(id, payload) {
      const res = await fetch(`${API_BASE}/notices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(AppState.authToken ? { 'Authorization': `Bearer ${AppState.authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update notice');
      }
      return res.json();
    },
    async deleteNotice(id) {
      const res = await fetch(`${API_BASE}/notices/${id}`, {
        method: 'DELETE',
        headers: {
          ...(AppState.authToken ? { 'Authorization': `Bearer ${AppState.authToken}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete notice');
      }
      return res.json();
    },
    async register(username, password) {
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          mode: 'cors',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json' 
          },
          body: JSON.stringify({ 
            username: username.trim(),
            password: password
          }),
        });
        
        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          const errorMsg = data.error || 'Registration failed. Please try again.';
          console.error('Registration error:', errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log('Registration successful for user:', username);
        return data;
        
      } catch (error) {
        console.error('Registration error:', error);
        throw new Error(error.message || 'Failed to register. Please try again.');
      }
    },
    async login(username, password) {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          mode: 'cors',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json' 
          },
          body: JSON.stringify({ 
            username: username.trim(),
            password: password
          }),
        });
        
        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          // Handle specific error cases
          if (res.status === 401) {
            throw new Error('Invalid username or password');
          } else if (res.status === 423) {
            throw new Error(data.error || 'Account is temporarily locked. Please try again later.');
          } else if (res.status === 429) {
            throw new Error('Too many attempts. Please wait before trying again.');
          } else {
            throw new Error(data.error || 'Login failed. Please try again.');
          }
        }
        
        console.log('Login successful for user:', username);
        return data;
        
      } catch (error) {
        console.error('Login error:', error);
        throw new Error(error.message || 'Failed to login. Please try again.');
      }
    },
  },
};

// View management functions
App.showStudentView = () => {
  AppState.currentView = 'student';
  Elements.studentBtn.classList.add('active');
  Elements.adminBtn.classList.remove('active');
  Elements.studentBtn.setAttribute('aria-selected', 'true');
  Elements.adminBtn.setAttribute('aria-selected', 'false');

  Elements.roleSelector.classList.remove('hidden');
  Elements.adminLogin.style.display = 'none';
  Elements.adminDashboard.style.display = 'none';
  Elements.studentView.style.display = 'block';
  Elements.logoutBtn.style.display = 'none';

  Elements.studentView.setAttribute('aria-hidden', 'false');
  Elements.adminLogin.setAttribute('aria-hidden', 'true');
  Elements.adminDashboard.setAttribute('aria-hidden', 'true');

  App.loadStudentNotices();
};

App.showAdminView = () => {
  AppState.currentView = 'admin';
  Elements.adminBtn.classList.add('active');
  Elements.studentBtn.classList.remove('active');
  Elements.adminBtn.setAttribute('aria-selected', 'true');
  Elements.studentBtn.setAttribute('aria-selected', 'false');

  Elements.roleSelector.classList.remove('hidden');
  Elements.studentView.style.display = 'none';
  Elements.studentView.setAttribute('aria-hidden', 'true');

  if (AppState.isAdminLoggedIn) {
    Elements.adminLogin.style.display = 'none';
    Elements.adminDashboard.style.display = 'block';
    Elements.logoutBtn.style.display = 'inline-block';
    Elements.adminLogin.setAttribute('aria-hidden', 'true');
    Elements.adminDashboard.setAttribute('aria-hidden', 'false');
    App.loadAdminNotices();
  } else {
    Elements.adminLogin.style.display = 'block';
    Elements.adminDashboard.style.display = 'none';
    Elements.logoutBtn.style.display = 'none';
    Elements.adminLogin.setAttribute('aria-hidden', 'false');
    Elements.adminDashboard.setAttribute('aria-hidden', 'true');
  }
};

// Login handling with improved validation
App.handleLogin = async (e) => {
  e.preventDefault();

  const username = Elements.username.value.trim();
  const password = Elements.password.value;
  const rememberMe = Elements.rememberMe && Elements.rememberMe.checked;

  // Clear previous errors and states
  App.clearFormErrors('login-form');
  document.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));
  
  // Enhanced validation
  let isValid = true;
  
  // Username validation
  if (!username) {
    App.showFieldError('username', 'Username is required');
    isValid = false;
  } else if (username.length < 3) {
    App.showFieldError('username', 'Username must be at least 3 characters');
    isValid = false;
  }
  
  // Password validation
  if (!password) {
    App.showFieldError('password', 'Password is required');
    isValid = false;
  } else if (password.length < 4) {
    App.showFieldError('password', 'Password must be at least 4 characters');
    isValid = false;
  }
  
  if (!isValid) {
    // Focus on first error field
    const firstError = document.querySelector('.is-invalid');
    if (firstError) firstError.focus();
    return;
  }

  // Show loading state
  App.setButtonLoading(Elements.loginSubmit, true);
  
  try {
    // Call the login API
    const data = await App.api.login(username, password);
    
    // Update app state
    AppState.authToken = data.token;
    AppState.isAdminLoggedIn = true;
    
    // Store token based on remember me preference
    try {
      // Clear any existing tokens
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // Store in appropriate storage
      if (rememberMe) {
        localStorage.setItem('authToken', data.token);
      } else {
        sessionStorage.setItem('authToken', data.token);
      }
    } catch (storageError) {
      console.warn('Error accessing storage:', storageError);
      // Continue without storing token if storage is not available
    }
    
    // Update UI
    Elements.adminLogin.style.display = 'none';
    Elements.adminDashboard.style.display = 'block';
    Elements.logoutBtn.style.display = 'inline-block';
    Elements.adminLogin.setAttribute('aria-hidden', 'true');
    Elements.adminDashboard.setAttribute('aria-hidden', 'false');
    
    // Show success message
    Utils.showToast('Login successful! Welcome back!', 'success');
    
    // Reset form
    Elements.loginForm.reset();
    
    // Load admin notices
    await App.loadAdminNotices();
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Show user-friendly error message
    let errorMessage = 'Login failed. Please check your credentials and try again.';
    
    if (error.message) {
      if (error.message.includes('locked')) {
        errorMessage = error.message;
      } else if (error.message.includes('attempts')) {
        errorMessage = error.message;
      } else if (error.message.includes('Invalid')) {
        App.showFieldError('username', ' '); // Space to maintain layout
        App.showFieldError('password', 'Invalid username or password');
        Elements.password.focus();
      }
    }
    
    Utils.showToast(errorMessage, 'error');
    
  } finally {
    // Reset loading state
    App.setButtonLoading(Elements.loginSubmit, false);
  }
};

// Registration handling (defined after App, Elements, and Utils exist)
App.handleRegister = async (e) => {
  e.preventDefault();
  
  const username = Elements.regUsername.value.trim();
  const password = Elements.regPassword.value;
  
  // Clear previous errors and states
  App.clearFormErrors('register-form');
  document.querySelectorAll('#register-form .form-control').forEach(el => 
    el.classList.remove('is-invalid')
  );
  
  // Enhanced validation
  let isValid = true;
  
  // Username validation
  if (!username) {
    App.showFieldError('reg-username', 'Username is required');
    isValid = false;
  } else if (username.length < 3) {
    App.showFieldError('reg-username', 'Username must be at least 3 characters');
    isValid = false;
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    App.showFieldError('reg-username', 'Username can only contain letters, numbers, and underscores');
    isValid = false;
  }
  
  // Password validation
  if (!password) {
    App.showFieldError('reg-password', 'Password is required');
    isValid = false;
  } else if (password.length < 4) {
    App.showFieldError('reg-password', 'Password must be at least 4 characters');
    isValid = false;
  }
  
  if (!isValid) {
    // Focus on first error field
    const firstError = document.querySelector('#register-form .is-invalid');
    if (firstError) firstError.focus();
    return;
  }
  
  // Show loading state
  App.setButtonLoading(Elements.registerSubmit, true);
  
  try {
    // Call the registration API
    const data = await App.api.register(username, password);
    
    // Update app state
    AppState.authToken = data.token;
    AppState.isAdminLoggedIn = true;
    
    try {
      // Clear any existing tokens
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // Store token in localStorage by default for new registrations
      localStorage.setItem('authToken', data.token);
    } catch (storageError) {
      console.warn('Error accessing storage:', storageError);
      // Continue without storing token if storage is not available
    }
    
    // Close registration modal if it exists
    if (Elements.registerModal) {
      Elements.registerModal.style.display = 'none';
      Elements.registerModal.setAttribute('aria-hidden', 'true');
      
      // Reset form after a short delay to allow modal close animation
      setTimeout(() => {
        Elements.registerForm.reset();
      }, 300);
    }
    
    // Update UI to show admin dashboard
    Elements.adminLogin.style.display = 'none';
    Elements.adminDashboard.style.display = 'block';
    Elements.logoutBtn.style.display = 'inline-block';
    Elements.adminLogin.setAttribute('aria-hidden', 'true');
    Elements.adminDashboard.setAttribute('aria-hidden', 'false');
    
    // Show success message
    Utils.showToast('Registration successful! Welcome to your dashboard!', 'success');
    
    // Load admin notices
    await App.loadAdminNotices();
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error cases
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error.message) {
      if (error.message.includes('already exists') || error.message.includes('taken')) {
        App.showFieldError('reg-username', 'Username is already taken');
        Elements.regUsername.focus();
      } else if (error.message.includes('characters')) {
        App.showFieldError('reg-password', error.message);
        Elements.regPassword.focus();
      }
      errorMessage = error.message;
    }
    
    Utils.showToast(errorMessage, 'error');
    
  } finally {
    // Reset loading state
    App.setButtonLoading(Elements.registerSubmit, false);
  }
};

// Helper functions for form handling
App.clearFormErrors = (formId) => {
  const form = document.getElementById(formId);
  if (!form) return;
  const errorElements = form.querySelectorAll('[id$="-error"]');
  errorElements.forEach((error) => {
    error.classList.add('hidden');
    error.textContent = '';
  });
};

App.showFieldError = (fieldId, message) => {
  const errorElement = document.getElementById(`${fieldId}-error`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
};

App.setButtonLoading = (button, isLoading) => {
  const textSpan = button.querySelector('.login-text, .save-text');
  const spinnerSpan = button.querySelector('.spinner');

  if (isLoading) {
    button.disabled = true;
    if (textSpan) textSpan.classList.add('hidden');
    if (spinnerSpan) spinnerSpan.classList.remove('hidden');
  } else {
    button.disabled = false;
    if (textSpan) textSpan.classList.remove('hidden');
    if (spinnerSpan) spinnerSpan.classList.add('hidden');
  }
};

App.updateCharacterCount = () => {
  const count = Elements.noticeDescription.value.length;
  Elements.descriptionCount.textContent = count;

  if (count > 900) {
    Elements.descriptionCount.parentElement.classList.add('text-red-500');
    Elements.descriptionCount.parentElement.classList.remove('text-gray-500');
  } else {
    Elements.descriptionCount.parentElement.classList.remove('text-red-500');
    Elements.descriptionCount.parentElement.classList.add('text-gray-500');
  }
};

// Logout function
App.logout = () => {
  AppState.isAdminLoggedIn = false;
  AppState.authToken = null;
  try { localStorage.removeItem('authToken'); } catch {}
  try { sessionStorage.removeItem('authToken'); } catch {}
  Elements.adminDashboard.style.display = 'none';
  Elements.adminLogin.style.display = 'block';
  Elements.logoutBtn.style.display = 'none';
  Elements.adminLogin.setAttribute('aria-hidden', 'false');
  Elements.adminDashboard.setAttribute('aria-hidden', 'true');

  // Clear login form
  Elements.loginForm.reset();
  App.clearFormErrors('login-form');

  Utils.showToast('Logged out successfully', 'success');
};

// Modal functions
App.openNewNoticeModal = () => {
  AppState.editingNoticeId = null;
  Elements.modalTitle.textContent = 'New Notice';
  Elements.noticeForm.reset();
  Elements.noticeModal.style.display = 'flex';
  Elements.noticeModal.setAttribute('aria-hidden', 'false');
  Elements.noticeTitle.focus();
  App.updateCharacterCount();
  App.clearSelectedImage();
};

App.closeModal = () => {
  Elements.noticeModal.style.display = 'none';
  Elements.noticeModal.setAttribute('aria-hidden', 'true');
  App.clearFormErrors('notice-form');
};

// Load Admin Notices with improved functionality
App.loadAdminNotices = () => {
  Utils.showLoading('notices-loading');
  Elements.noticesLoading.classList.remove('hidden');

  App.api.listNotices()
    .then((data) => {
      AppState.notices = Array.isArray(data) ? data : [];
      Elements.noticesList.innerHTML = '';
      Elements.noNotices.classList.add('hidden');

      if (AppState.notices.length === 0) {
        Elements.noticesLoading.classList.add('hidden');
        Elements.noNotices.classList.remove('hidden');
        return;
      }

      const sortedNotices = [...AppState.notices].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      sortedNotices.forEach((notice) => {
        const li = document.createElement('li');
        li.className =
          'flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-200 slide-up';
        li.innerHTML = `
          <div class="mb-2 sm:mb-0 flex-1">
          <h3 class="font-semibold text-lg mb-1">${Utils.sanitizeInput(notice.title)}</h3>
          <p class="text-sm text-gray-600 mb-1">${Utils.formatDate(notice.created_at)}</p>
          <p class="text-sm text-gray-500">${Utils.sanitizeInput((notice.content || '').substring(0, 100))}${(notice.content || '').length > 100 ? '...' : ''}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="edit-btn btn-primary px-3 py-1 text-sm" 
                    data-id="${notice.id}" 
                    aria-label="Edit notice: ${Utils.sanitizeInput(notice.title)}">
              <i class="bi bi-pencil mr-1"></i>Edit
            </button>
            <button class="delete-btn btn-danger px-3 py-1 text-sm" 
                    data-id="${notice.id}"
                    aria-label="Delete notice: ${Utils.sanitizeInput(notice.title)}">
              <i class="bi bi-trash mr-1"></i>Delete
            </button>
          </div>
        `;
        Elements.noticesList.appendChild(li);
      });

      // Add event listeners
      Elements.noticesList.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', (e) =>
          App.editNotice(parseInt(e.target.closest('button').dataset.id))
        );
      });

      Elements.noticesList.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', (e) =>
          App.deleteNotice(parseInt(e.target.closest('button').dataset.id))
        );
      });

      Elements.noticesLoading.classList.add('hidden');
    })
    .catch((err) => {
      console.error(err);
      Elements.noticesLoading.classList.add('hidden');
      Elements.noNotices.classList.remove('hidden');
      Utils.showToast('Failed to load notices', 'error');
    });
};

// Load Student Notices with improved functionality
App.loadStudentNotices = () => {
  Elements.studentNoticesLoading.classList.remove('hidden');
  if (Elements.noStudentNotices) Elements.noStudentNotices.classList.add('hidden');

  App.api.listNotices()
    .then((data) => {
      AppState.notices = Array.isArray(data) ? data : [];
      Elements.studentNotices.innerHTML = '';

      const filteredNotices = [...AppState.notices].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      if (filteredNotices.length === 0) {
        Elements.studentNoticesLoading.classList.add('hidden');
        if (Elements.noStudentNotices) Elements.noStudentNotices.classList.remove('hidden');
        App.updateScrollButtons();
        return;
      }

      filteredNotices.forEach((notice, index) => {
        const card = document.createElement('div');
        card.className = 'notice-card p-0 overflow-hidden slide-up';
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
        ${notice.image_url ? `
        <div class="notice-image-wrap">
          <img src="${notice.image_url}"
               alt="Notice image for ${Utils.sanitizeInput(notice.title)}"
               class="notice-image"
               data-fullsrc="${notice.image_url}"/>
        </div>` : ''}
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-2xl font-semibold text-gray-800 leading-tight">${Utils.sanitizeInput(notice.title)}</h3>
            <span class="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full whitespace-nowrap ml-2">
              ${Utils.formatDate(notice.created_at)}
            </span>
          </div>
          <p class="text-gray-700 mb-6 leading-relaxed text-lg">${Utils.sanitizeInput(notice.content || '')}</p>
          <div class="flex justify-between items-center">
            <p class="text-sm text-gray-500">
              <i class="bi bi-calendar-event mr-1"></i>
              Posted: ${Utils.formatDate(notice.created_at)}
            </p>
          </div>
        </div>
      `;
        Elements.studentNotices.appendChild(card);
        const img = card.querySelector('img.notice-image');
        if (img) {
          img.addEventListener('click', () => {
            const src = img.getAttribute('data-fullsrc') || img.src;
            App.openImageLightbox(src, img.alt || 'Notice image');
          });
        }
      });

      Elements.studentNoticesLoading.classList.add('hidden');
      App.updateScrollButtons();
    })
    .catch((err) => {
      console.error(err);
      Elements.studentNoticesLoading.classList.add('hidden');
      if (Elements.noStudentNotices) Elements.noStudentNotices.classList.remove('hidden');
      Utils.showToast('Failed to load notices', 'error');
    });
};

// Scroll functionality
App.scrollLeft = () => {
  const container = Elements.studentNotices;
  const scrollAmount = container.clientWidth * 0.8;
  container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
};

App.scrollRight = () => {
  const container = Elements.studentNotices;
  const scrollAmount = container.clientWidth * 0.8;
  container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};

App.updateScrollButtons = () => {
  const container = Elements.studentNotices;
  if (!container) return;

  const isAtStart = container.scrollLeft <= 0;
  const isAtEnd = container.scrollLeft >= (container.scrollWidth - container.clientWidth);

  Elements.scrollLeft.disabled = isAtStart;
  Elements.scrollRight.disabled = isAtEnd;
};

// Add scroll event listener to update button states
document.addEventListener('DOMContentLoaded', () => {
  const sn = document.getElementById('student-notices');
  if (sn) sn.addEventListener('scroll', App.updateScrollButtons);
});

// Edit Notice function
App.editNotice = (id) => {
  const notice = AppState.notices.find((n) => n.id === id);
  if (notice) {
    AppState.editingNoticeId = id;
    Elements.modalTitle.textContent = 'Edit Notice';
    Elements.noticeTitle.value = notice.title;
    Elements.noticeDescription.value = notice.content || '';
    // No date field
    Elements.noticeModal.style.display = 'flex';
    Elements.noticeModal.setAttribute('aria-hidden', 'false');
    Elements.noticeTitle.focus();
    App.updateCharacterCount();
    // If notice has image_url, display filename inferred from URL (read-only reference)
    if (notice.image_url && Elements.imageInfoWrap && Elements.selectedImageName) {
      try {
        const url = new URL(notice.image_url, window.location.origin);
        const parts = url.pathname.split('/');
        const name = parts[parts.length - 1] || 'image';
        Elements.selectedImageName.textContent = name;
      } catch (err) {
        Elements.selectedImageName.textContent = notice.image_url;
      }
      Elements.imageInfoWrap.classList.remove('hidden');
      AppState.selectedImageFilename = null; // unknown server filename
    } else {
      App.clearSelectedImage();
    }
  }
};

// Handle Notice Form Submission
App.handleNoticeSubmit = async (e) => {
  e.preventDefault();

  const title = Elements.noticeTitle.value.trim();
  const description = Elements.noticeDescription.value.trim();
  const fileInput = Elements.noticeFile;
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;

  // Clear previous errors
  App.clearFormErrors('notice-form');

  // Validate inputs
  const titleError = Utils.validateInput(title, 'text', 1, 100);
  const descriptionError = Utils.validateInput(description, 'text', 1, 1000);

  if (titleError) {
    App.showFieldError('notice-title', titleError);
    return;
  }

  if (descriptionError) {
    App.showFieldError('notice-description', descriptionError);
    return;
  }

  // Client-side image validation (size/type) before sending
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.heic', '.heif'];
  const hasSelectedLibraryImage = !!AppState.selectedImageFilename;
  if (file) {
    const lowerName = file.name.toLowerCase();
    const ext = lowerName.substring(lowerName.lastIndexOf('.')) || '';
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      Utils.showToast('Unsupported image type. Allowed: PNG, JPG, JPEG, GIF, HEIC, HEIF', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      Utils.showToast('Image too large (max 10 MB)', 'error');
      return;
    }
  }
  // If neither local file nor library image is selected, proceed (image is optional)

  // Show loading state
  App.setButtonLoading(Elements.saveNoticeBtn, true);

  try {
    // Require auth token for creating/updating notices
    if (!AppState.authToken) {
      throw new Error('Unauthorized: Please login to create or update notices');
    }
    // Build multipart form data
    const fd = new FormData();
    fd.append('title', title);
    fd.append('content', description);
    if (file) {
      fd.append('image', file);
    } else if (AppState.selectedImageFilename) {
      fd.append('image_filename', AppState.selectedImageFilename);
    }

    const headers = {};
    if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;

    if (AppState.editingNoticeId) {
      const res = await fetch(`${API_BASE}/notices/${AppState.editingNoticeId}`, {
        method: 'PUT',
        headers,
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Map internal errors to a friendly message
        const msg = (res.status >= 500 || (err && /internal server error/i.test(String(err.error))))
          ? 'Failed to save notice. Please try again later.'
          : (err.error || `Failed to update notice (status ${res.status})`);
        if (res.status === 401) {
          throw new Error('Unauthorized: Please login to update notices');
        }
        throw new Error(msg);
      }
      Utils.showToast('Notice updated successfully!', 'success');
    } else {
      const res = await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers,
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Map internal errors to a friendly message
        const msg = (res.status >= 500 || (err && /internal server error/i.test(String(err.error))))
          ? 'Failed to save notice. Please try again later.'
          : (err.error || `Failed to create notice (status ${res.status})`);
        if (res.status === 401) {
          throw new Error('Unauthorized: Please login to create notices');
        }
        throw new Error(msg);
      }
      Utils.showToast('Notice created successfully!', 'success');
    }

    // Close modal and refresh views
    App.closeModal();
    // Clear selected image state
    App.clearSelectedImage();
    // Refresh only the current view to avoid unintended tab switching
    if (AppState.currentView === 'admin') {
      App.loadAdminNotices();
    } else {
      App.loadStudentNotices();
    }
  } catch (error) {
    // Fallback friendly message for unexpected/internal errors
    const message = /internal server error|failed to fetch|network/i.test(String(error.message))
      ? 'Failed to save notice. Please try again later.'
      : (error.message || 'Failed to save notice. Please try again later.');
    Utils.showToast(message, 'error');
    console.error('Save notice error:', error);
    // If unauthorized, route user to login panel
    if (String(error.message).toLowerCase().includes('unauthorized')) {
      App.showAdminView();
      Elements.adminLogin.style.display = 'block';
      Elements.adminDashboard.style.display = 'none';
      Elements.adminLogin.setAttribute('aria-hidden', 'false');
      Elements.adminDashboard.setAttribute('aria-hidden', 'true');
    }
  } finally {
    App.setButtonLoading(Elements.saveNoticeBtn, false);
  }
};

// Media Library
App.openMediaLibrary = async () => {
  if (!Elements.mediaModal) return;
  Elements.mediaModal.style.display = 'flex';
  Elements.mediaModal.setAttribute('aria-hidden', 'false');
  await App.loadMediaLibrary();
};

App.closeMediaModal = () => {
  if (!Elements.mediaModal) return;
  Elements.mediaModal.style.display = 'none';
  Elements.mediaModal.setAttribute('aria-hidden', 'true');
};

App.loadMediaLibrary = async () => {
  if (!Elements.mediaGrid) return;
  Elements.mediaGrid.innerHTML = '';
  if (Elements.mediaEmpty) Elements.mediaEmpty.classList.add('hidden');
  if (Elements.mediaLoading) Elements.mediaLoading.classList.remove('hidden');
  try {
    const res = await fetch(`${API_BASE}/media`);
    const files = await res.json();
    if (!Array.isArray(files) || files.length === 0) {
      if (Elements.mediaEmpty) Elements.mediaEmpty.classList.remove('hidden');
      return;
    }
    files.forEach((file) => {
      const item = document.createElement('div');
      item.className = 'media-item';
      item.setAttribute('role', 'listitem');
      item.innerHTML = `
        <img src="${file.url}" alt="${file.filename}" class="media-thumb"/>
        <div class="media-meta">${file.filename}</div>
      `;
      item.addEventListener('click', () => {
        App.selectMedia(file.filename, file.url, item);
      });
      Elements.mediaGrid.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load media', err);
    if (Elements.mediaEmpty) Elements.mediaEmpty.classList.remove('hidden');
  } finally {
    if (Elements.mediaLoading) Elements.mediaLoading.classList.add('hidden');
  }
};

App.selectMedia = (filename, url, itemEl) => {
  // Set selection state
  AppState.selectedImageFilename = filename;
  if (Elements.noticeFile) Elements.noticeFile.value = '';
  // Show filename only
  if (Elements.selectedImageName) Elements.selectedImageName.textContent = filename;
  if (Elements.imageInfoWrap) Elements.imageInfoWrap.classList.remove('hidden');
  // Highlight selected item
  if (Elements.mediaGrid) {
    Elements.mediaGrid.querySelectorAll('.media-item.selected').forEach(el => el.classList.remove('selected'));
  }
  if (itemEl) itemEl.classList.add('selected');
  // Close modal
  App.closeMediaModal();
};

App.clearSelectedImage = () => {
  AppState.selectedImageFilename = null;
  if (Elements.noticeFile) Elements.noticeFile.value = '';
  if (Elements.selectedImageName) Elements.selectedImageName.textContent = '';
  if (Elements.imageInfoWrap) Elements.imageInfoWrap.classList.add('hidden');
};

// Delete Notice function
App.deleteNotice = async (id) => {
  const notice = AppState.notices.find((n) => n.id === id);
  if (!notice) return;

  // Create a more user-friendly confirmation dialog
  const confirmed = await new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'notice-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="notice-modal-content" style="max-width: 400px;">
        <h3 class="text-xl font-bold mb-4 text-red-600">Confirm Deletion</h3>
        <p class="mb-6">Are you sure you want to delete the notice "<strong>${Utils.sanitizeInput(
          notice.title
        )}</strong>"? This action cannot be undone.</p>
        <div class="flex gap-3">
          <button id="confirm-delete" class="btn-danger flex-1">Delete</button>
          <button id="cancel-delete" class="btn-primary flex-1">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal
      .querySelector('#confirm-delete')
      .addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(true);
      });

    modal.querySelector('#cancel-delete').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    });
  });

  if (confirmed) {
    try {
      await App.api.deleteNotice(id);
      // Refresh only the current view to avoid unintended tab switching
      if (AppState.currentView === 'admin') {
        App.loadAdminNotices();
      } else {
        App.loadStudentNotices();
      }
      Utils.showToast('Notice deleted successfully', 'success');
    } catch (error) {
      Utils.showToast('Failed to delete notice', 'error');
      console.error('Delete notice error:', error);
    }
  }
};


// Initialize the application once
(function initOnce() {
  if (window.__noticeboard_initialized__) return;
  window.__noticeboard_initialized__ = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
  } else {
    App.init();
  }
})();
