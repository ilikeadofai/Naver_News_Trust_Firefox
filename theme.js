// Theme toggle functionality for Firefox extension
(function() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleResult = document.getElementById('theme-toggle-result');
    const themeModeBtns = document.querySelectorAll('.theme-mode-btn');
    
    let currentMode = 'auto'; // 'auto' or 'manual'
    let manualTheme = 'light';
    let mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Load saved preferences from browser storage
    function loadPreferences() {
        if (typeof browser !== 'undefined' && browser.storage) {
            // Firefox
            browser.storage.local.get(['themeMode', 'manualTheme']).then((result) => {
                currentMode = result.themeMode || 'auto';
                manualTheme = result.manualTheme || 'light';
                applyTheme();
                updateUI();
            });
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            // Chrome
            chrome.storage.local.get(['themeMode', 'manualTheme'], (result) => {
                currentMode = result.themeMode || 'auto';
                manualTheme = result.manualTheme || 'light';
                applyTheme();
                updateUI();
            });
        } else {
            // Fallback to localStorage
            currentMode = localStorage.getItem('themeMode') || 'auto';
            manualTheme = localStorage.getItem('manualTheme') || 'light';
            applyTheme();
            updateUI();
        }
    }
    
    // Save preferences
    function savePreferences() {
        if (typeof browser !== 'undefined' && browser.storage) {
            // Firefox
            browser.storage.local.set({ 
                themeMode: currentMode,
                manualTheme: manualTheme 
            });
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            // Chrome
            chrome.storage.local.set({ 
                themeMode: currentMode,
                manualTheme: manualTheme 
            });
        } else {
            // Fallback to localStorage
            localStorage.setItem('themeMode', currentMode);
            localStorage.setItem('manualTheme', manualTheme);
        }
    }
    
    // Get system theme
    function getSystemTheme() {
        return mediaQuery.matches ? 'dark' : 'light';
    }
    
    // Apply theme based on mode
    function applyTheme() {
        let theme;
        if (currentMode === 'auto') {
            theme = getSystemTheme();
        } else {
            theme = manualTheme;
        }
        document.documentElement.setAttribute('data-theme', theme);
    }
    
    // Update UI state
    function updateUI() {
        // Update mode buttons
        themeModeBtns.forEach(btn => {
            const mode = btn.getAttribute('data-mode');
            if (mode === currentMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Enable/disable manual toggle
        const toggles = [themeToggle, themeToggleResult];
        toggles.forEach(toggle => {
            if (toggle) {
                if (currentMode === 'auto') {
                    toggle.classList.add('disabled');
                } else {
                    toggle.classList.remove('disabled');
                }
            }
        });
    }
    
    // Toggle manual theme
    function toggleManualTheme() {
        if (currentMode !== 'manual') return;
        
        manualTheme = manualTheme === 'light' ? 'dark' : 'light';
        applyTheme();
        savePreferences();
    }
    
    // Switch mode
    function switchMode(mode) {
        currentMode = mode;
        applyTheme();
        updateUI();
        savePreferences();
    }
    
    // Listen to system theme changes in auto mode
    function handleSystemThemeChange(e) {
        if (currentMode === 'auto') {
            applyTheme();
        }
    }
    
    // Initialize
    loadPreferences();
    
    // Add event listeners
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleManualTheme);
    }
    if (themeToggleResult) {
        themeToggleResult.addEventListener('click', toggleManualTheme);
    }
    
    themeModeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = btn.getAttribute('data-mode');
            switchMode(mode);
        });
    });
    
    // Listen for system theme changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);
})();
