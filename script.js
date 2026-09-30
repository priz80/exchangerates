// ==================== КОНФИГУРАЦИЯ ====================
const API_BASE = 'https://open.er-api.com/v6/latest'; // Бесплатный API без ключа
const RUB = 'RUB';

// ==================== СОСТОЯНИЕ ====================
let state = {
    rates: {},
    currency: 'USD',
    direction: 'foreignToRub', // 'foreignToRub' | 'rubToForeign'
    lastUpdate: null,
    loading: false
};

// ==================== DOM-ЭЛЕМЕНТЫ ====================
const elements = {
    radios: document.querySelectorAll('input[name="currency"]'),
    amountInput: document.getElementById('amount'),
    amountLabel: document.querySelector('.input-group:first-child .input-group__label'),
    amountCurrency: document.getElementById('displayCurrency'),
    resultInput: document.getElementById('result'),
    resultLabel: document.querySelector('.input-group:nth-child(3) .input-group__label'),
    resultCurrency: document.querySelector('.input-group:nth-child(3) .input-group__currency'),
    rateValue: document.getElementById('rateValue'),
    swapBtn: document.getElementById('swapBtn'),
    statusBar: document.getElementById('statusBar')
};

// ==================== API ====================
async function fetchRates(base = 'USD') {
    try {
        setStatus('loading', 'Загрузка курсов...');
        const response = await fetch(`${API_BASE}/${base}`);
        
        if (!response.ok) throw new Error('Ошибка сети');
        
        const data = await response.json();
        
        if (data.result === 'success') {
            state.rates = data.rates;
            state.lastUpdate = data.time_last_update_utc;
            setStatus('success', 'Курсы загружены');
            convert();
            updateRateDisplay();
        } else {
            throw new Error('API вернул ошибку');
        }
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        setStatus('error', 'Не удалось загрузить курсы. Используем резервные.');
        useFallbackRates();
    }
}

function useFallbackRates() {
    // Резервные курсы в формате API (относительно USD)
    state.rates = {
        USD: 1,
        EUR: 0.85,
        RUB: 92.50
    };
    state.lastUpdate = new Date().toISOString();
    convert();
    updateRateDisplay();
}

// ==================== ПОЛУЧЕНИЕ КУРСА К РУБЛЮ ====================
// API возвращает курсы относительно базовой валюты.
// Например при базе USD: rates.RUB=92.50, rates.EUR=0.85
// Курс 1 EUR к рублю = rates.RUB / rates.EUR = 92.50 / 0.85 ≈ 108.82
function getRateToRub(currency) {
    const rubRate = state.rates['RUB'];
    const currencyRate = state.rates[currency];
    
    if (!rubRate || !currencyRate) return null;
    
    return rubRate / currencyRate;
}

// ==================== КОНВЕРТАЦИЯ ====================
function convert() {
    const amount = parseFloat(elements.amountInput.value);
    
    if (isNaN(amount) || amount === 0) {
        elements.resultInput.value = '';
        return;
    }

    const rate = getRateToRub(state.currency);
    
    if (!rate) return;

    let result;
    
    if (state.direction === 'foreignToRub') {
        // Валюта → Рубли
        result = amount * rate;
    } else {
        // Рубли → Валюта
        result = amount / rate;
    }

    elements.resultInput.value = formatNumber(result, 2);
}

// ==================== UI ====================
function updateRateDisplay() {
    const rate = getRateToRub(state.currency);
    if (rate) {
        elements.rateValue.textContent = `1 ${state.currency} = ${formatNumber(rate, 2)} ₽`;
    }
}

function updateCurrencyDisplay() {
    if (state.direction === 'foreignToRub') {
        elements.amountCurrency.textContent = state.currency;
    } else {
        elements.resultCurrency.textContent = state.currency;
        elements.resultLabel.textContent = state.currency;
    }
    updateRateDisplay();
    convert();
}

function setStatus(type, message) {
    const icons = { loading: '⏳', success: '✅', error: '⚠️' };
    const colors = { loading: '#f59e0b', success: '#10b981', error: '#ef4444' };
    
    elements.statusBar.className = `status-bar status-bar--${type}`;
    elements.statusBar.querySelector('.status-bar__icon').textContent = icons[type] || 'ℹ️';
    elements.statusBar.querySelector('.status-bar__text').textContent = message;
    elements.statusBar.style.borderColor = colors[type] || '#6b7280';
}

function formatNumber(num, decimals = 2) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

// ==================== СМЕНА НАПРАВЛЕНИЯ ====================
function swapDirection() {
    state.direction = state.direction === 'foreignToRub' ? 'rubToForeign' : 'foreignToRub';
    
    if (state.direction === 'rubToForeign') {
        // Рубли → Валюта
        elements.amountLabel.textContent = 'Рубли';
        elements.amountInput.placeholder = 'Введите рубли';
        elements.amountInput.value = '';
        elements.amountCurrency.textContent = '₽';
        elements.amountCurrency.style.color = 'var(--color-text-secondary)';
        elements.amountCurrency.style.background = '#f9fafb';
        
        elements.resultLabel.textContent = state.currency;
        elements.resultInput.placeholder = '0.00';
        elements.resultInput.removeAttribute('readonly');
        elements.resultCurrency.textContent = state.currency;
        elements.resultCurrency.style.color = 'var(--color-primary)';
        elements.resultCurrency.style.background = '#eef2ff';
        
        elements.swapBtn.classList.add('swap-btn--active');
    } else {
        // Валюта → Рубли
        elements.amountLabel.textContent = 'Сумма';
        elements.amountInput.placeholder = 'Введите количество';
        elements.amountInput.value = '1';
        elements.amountCurrency.textContent = state.currency;
        elements.amountCurrency.style.color = 'var(--color-text-secondary)';
        elements.amountCurrency.style.background = '#f9fafb';
        
        elements.resultLabel.textContent = 'Результат';
        elements.resultInput.placeholder = '0.00';
        elements.resultInput.setAttribute('readonly', '');
        elements.resultCurrency.textContent = '₽';
        elements.resultCurrency.style.color = 'var(--color-primary)';
        elements.resultCurrency.style.background = '#eef2ff';
        
        elements.swapBtn.classList.remove('swap-btn--active');
    }
    
    // Анимация смены
    elements.swapBtn.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        elements.swapBtn.style.transform = '';
    }, 300);
    
    convert();
}

// ==================== СОБЫТИЯ ====================
function initEvents() {
    // Выбор валюты
    elements.radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.currency = e.target.value;
            updateCurrencyDisplay();
        });
    });

    // Ввод суммы
    elements.amountInput.addEventListener('input', convert);

    // Кнопка swap
    elements.swapBtn.addEventListener('click', swapDirection);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
function init() {
    initEvents();
    fetchRates('USD');
    
    // Обновляем курсы каждые 60 минут
    setInterval(() => fetchRates(state.currency), 60 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
