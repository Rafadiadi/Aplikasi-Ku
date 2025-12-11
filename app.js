let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let emergencyFundData = JSON.parse(localStorage.getItem('emergencyFundData')) || null;
let currentWeekOffset = 0;
let weeklyChart = null;
let investmentChart = null;
let marketDataCache = {};
let currentCarouselIndex = 0;
const carouselSymbols = ['SPY', 'QQQ', 'NVDA', 'BBCA', 'BTC'];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTransactionForm();
    initEmergencyForm();
    initETFForm();
    initWeekFilter();
    setDefaultDate();
    updateDashboard();
    renderTransactions();
    initMarketData();
    initCurrencyInputs();
    initCarousel();
});

function initCurrencyInputs() {
    const currencyInputs = document.querySelectorAll('.currency-input');
    currencyInputs.forEach(input => {
        input.addEventListener('input', (e) => formatCurrencyInput(e.target));
        input.addEventListener('blur', (e) => formatCurrencyInput(e.target));
        input.addEventListener('focus', (e) => setTimeout(() => e.target.select(), 0));
        input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') e.preventDefault();
        });
        if (input.value && input.value !== '0') formatCurrencyInput(input);
    });
}

function formatCurrencyInput(input) {
    const cursorPos = input.selectionStart;
    const oldLength = input.value.length;
    let value = input.value.replace(/[^\d]/g, '');
    value = value.replace(/^0+/, '') || '0';
    const formatted = formatNumberWithComma(value);
    input.value = formatted;
    const newLength = formatted.length;
    const diff = newLength - oldLength;
    const newCursorPos = Math.max(0, cursorPos + diff);
    setTimeout(() => input.setSelectionRange(newCursorPos, newCursorPos), 0);
}

function formatNumberWithComma(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function parseFormattedCurrency(str) {
    if (!str) return 0;
    return parseInt(str.replace(/[^\d]/g, '')) || 0;
}

function initCarousel() {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');
    
    carouselSymbols.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
    
    prevBtn.addEventListener('click', () => {
        currentCarouselIndex = (currentCarouselIndex - 1 + carouselSymbols.length) % carouselSymbols.length;
        updateCarousel();
    });
    
    nextBtn.addEventListener('click', () => {
        currentCarouselIndex = (currentCarouselIndex + 1) % carouselSymbols.length;
        updateCarousel();
    });
}

function goToSlide(index) {
    currentCarouselIndex = index;
    updateCarousel();
}

function updateCarousel() {
    const cards = document.querySelectorAll('.stock-detail-card');
    const dots = document.querySelectorAll('.carousel-dot');
    
    cards.forEach((card, index) => {
        card.classList.toggle('active', index === currentCarouselIndex);
    });
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentCarouselIndex);
    });
}

async function initMarketData() {
    await fetchAllMarketData();
    setInterval(fetchAllMarketData, 60000);
}

async function fetchAllMarketData() {
    const usSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META'];
    const idSymbols = ['IHSG', 'BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'UNVR', 'GOTO'];
    
    updateTickerTime();
    
    for (const symbol of usSymbols) {
        await fetchStockData(symbol, 'US');
    }
    for (const symbol of idSymbols) {
        await fetchStockData(symbol, 'ID');
    }
    await fetchCryptoData();
    updateDetailCards();
}

async function fetchStockData(symbol, market = 'US') {
    try {
        const mockData = generateMockStockData(symbol, market);
        updateTickerUI(symbol.toLowerCase(), mockData, market);
        marketDataCache[symbol] = mockData;
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
    }
}

function generateMockStockData(symbol, market = 'US') {
    const basePrices = {
        'SPY': 598.88, 'QQQ': 525.75, 'AAPL': 248.50, 'MSFT': 448.20, 'NVDA': 138.50, 'GOOGL': 187.40,
        'AMZN': 227.50, 'TSLA': 394.20, 'META': 612.80,
        'IHSG': 7285, 'BBCA': 10125, 'BBRI': 4650, 'BMRI': 6350, 'TLKM': 2820, 'ASII': 4850, 'UNVR': 2450, 'GOTO': 84
    };
    const volatility = {
        'SPY': 0.008, 'QQQ': 0.01, 'AAPL': 0.012, 'MSFT': 0.011, 'NVDA': 0.025, 'GOOGL': 0.013,
        'AMZN': 0.015, 'TSLA': 0.03, 'META': 0.018,
        'IHSG': 0.008, 'BBCA': 0.012, 'BBRI': 0.015, 'BMRI': 0.012, 'TLKM': 0.01, 'ASII': 0.012, 'UNVR': 0.01, 'GOTO': 0.03
    };
    const basePrice = basePrices[symbol] || 100;
    const isIDStock = market === 'ID';
    const vol = volatility[symbol] || 0.01;
    const cached = marketDataCache[symbol];
    let currentPrice, prevClose;
    
    if (cached && cached.price) {
        const movement = (Math.random() - 0.5) * basePrice * vol;
        currentPrice = cached.price + movement;
        prevClose = cached.prevClose || cached.price;
    } else {
        const variation = (Math.random() - 0.5) * basePrice * vol * 2;
        currentPrice = basePrice + variation;
        prevClose = basePrice - (Math.random() - 0.5) * basePrice * vol;
    }
    
    if (isIDStock) {
        if (symbol === 'GOTO') {
            currentPrice = Math.round(currentPrice);
            prevClose = Math.round(prevClose);
        } else {
            currentPrice = Math.round(currentPrice / 25) * 25;
            prevClose = Math.round(prevClose / 25) * 25;
        }
    }
    
    const change = currentPrice - prevClose;
    const changePercent = (change / prevClose) * 100;
    const dayRange = Math.abs(change) + basePrice * vol;
    
    return {
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        open: prevClose + (Math.random() - 0.5) * basePrice * vol,
        high: Math.max(currentPrice, prevClose) + Math.random() * dayRange,
        low: Math.min(currentPrice, prevClose) - Math.random() * dayRange,
        prevClose: prevClose,
        volume: Math.floor(Math.random() * 50000000) + 10000000,
        fiftyTwoWeekHigh: basePrice * 1.15,
        fiftyTwoWeekLow: basePrice * 0.85,
        market: market,
        currency: isIDStock ? 'IDR' : 'USD'
    };
}

async function fetchCryptoData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_market_cap=true&include_24hr_vol=true');
        if (response.ok) {
            const data = await response.json();
            const cryptos = [
                { id: 'bitcoin', symbol: 'btc', data: data.bitcoin },
                { id: 'ethereum', symbol: 'eth', data: data.ethereum },
                { id: 'solana', symbol: 'sol', data: data.solana },
                { id: 'ripple', symbol: 'xrp', data: data.ripple }
            ];
            cryptos.forEach(c => {
                if (c.data) {
                    const cryptoData = {
                        price: c.data.usd,
                        changePercent: c.data.usd_24h_change || 0,
                        high: c.data.usd_24h_high || c.data.usd * 1.02,
                        low: c.data.usd_24h_low || c.data.usd * 0.98,
                        marketCap: c.data.usd_market_cap || 0,
                        volume: c.data.usd_24h_vol || 0
                    };
                    updateCryptoUI(c.symbol, cryptoData);
                    marketDataCache[c.symbol.toUpperCase()] = cryptoData;
                }
            });
        }
    } catch (error) {
        console.error('Error fetching Crypto:', error);
        const fallbackData = [
            { symbol: 'btc', price: 101500, change: 2.5 },
            { symbol: 'eth', price: 3950, change: 1.8 },
            { symbol: 'sol', price: 225, change: 3.2 },
            { symbol: 'xrp', price: 2.45, change: -1.5 }
        ];
        fallbackData.forEach(c => {
            const data = { price: c.price + (Math.random() - 0.5) * c.price * 0.02, changePercent: c.change + (Math.random() - 0.5) * 2 };
            updateCryptoUI(c.symbol, data);
            marketDataCache[c.symbol.toUpperCase()] = data;
        });
    }
}

function updateTickerUI(symbol, data, market = 'US') {
    const tickerItem = document.getElementById(`${symbol}-ticker`);
    const priceEl = document.getElementById(`${symbol}-price`);
    const changeEl = document.getElementById(`${symbol}-change`);
    
    if (!priceEl || !changeEl) return;
    
    const isUp = data.change >= 0;
    const isIDStock = market === 'ID';
    
    if (isIDStock) {
        priceEl.textContent = formatIDR(data.price);
    } else {
        priceEl.textContent = `$${data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    const changeSign = isUp ? '+' : '';
    changeEl.textContent = `${changeSign}${data.changePercent.toFixed(2)}%`;
    
    if (tickerItem) {
        tickerItem.className = `strip-item ${isUp ? 'up' : 'down'}`;
    }
}

function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function updateCryptoUI(symbol, data) {
    const priceEl = document.getElementById(`${symbol}-price`);
    const changeEl = document.getElementById(`${symbol}-change`);
    const tickerItem = document.getElementById(`${symbol}-ticker`);
    
    if (!priceEl || !changeEl) return;
    
    const isUp = data.changePercent >= 0;
    priceEl.textContent = `$${data.price.toLocaleString('en-US', { minimumFractionDigits: data.price < 10 ? 2 : 0, maximumFractionDigits: data.price < 10 ? 4 : 0 })}`;
    
    const changeSign = isUp ? '+' : '';
    changeEl.textContent = `${changeSign}${data.changePercent.toFixed(2)}%`;
    
    if (tickerItem) {
        tickerItem.className = `strip-item ${isUp ? 'up' : 'down'}`;
    }
}

function updateTickerTime() {
    const timeEl = document.getElementById('ticker-update-time');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('id-ID');
    }
}

function updateDetailCards() {
    const detailSymbols = {
        'SPY': { name: 'SPY', currency: 'USD', type: 'stock' },
        'QQQ': { name: 'QQQ', currency: 'USD', type: 'stock' },
        'NVDA': { name: 'NVDA', currency: 'USD', type: 'stock' },
        'BBCA': { name: 'BBCA', currency: 'IDR', type: 'stock' },
        'BTC': { name: 'BTC', currency: 'USD', type: 'crypto' }
    };
    
    Object.keys(detailSymbols).forEach(symbol => {
        const data = marketDataCache[symbol];
        if (!data) return;
        
        const info = detailSymbols[symbol];
        const symbolLower = symbol.toLowerCase();
        const isUp = (data.change || 0) >= 0 || (data.changePercent || 0) >= 0;
        const isIDR = info.currency === 'IDR';
        
        const priceEl = document.getElementById(`detail-${symbolLower}-price`);
        const changeEl = document.getElementById(`detail-${symbolLower}-change`);
        
        if (priceEl) {
            priceEl.textContent = isIDR ? formatIDR(data.price) : data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        if (changeEl) {
            const changeSign = isUp ? '+' : '';
            if (info.type === 'crypto') {
                changeEl.textContent = `${changeSign}${data.changePercent.toFixed(2)}% (24h)`;
            } else if (isIDR) {
                changeEl.textContent = `${changeSign}${formatIDR(Math.round(data.change))} (${changeSign}${data.changePercent.toFixed(2)}%)`;
            } else {
                changeEl.textContent = `${changeSign}$${Math.abs(data.change).toFixed(2)} (${changeSign}${data.changePercent.toFixed(2)}%)`;
            }
            changeEl.className = `stock-change-large ${isUp ? 'up' : 'down'}`;
        }
        
        if (info.type === 'stock') {
            updateStockStats(symbolLower, data, isIDR);
        } else {
            updateCryptoStats(symbolLower, data);
        }
        
        updateMarketStatus(symbolLower, info.type);
        updateRecommendation(symbol, data, info.type);
    });
}

function updateStockStats(symbol, data, isIDR) {
    const format = (val) => isIDR ? formatIDR(Math.round(val)) : `$${val.toFixed(2)}`;
    
    const openEl = document.getElementById(`detail-${symbol}-open`);
    const highEl = document.getElementById(`detail-${symbol}-high`);
    const lowEl = document.getElementById(`detail-${symbol}-low`);
    const prevEl = document.getElementById(`detail-${symbol}-prev`);
    const volEl = document.getElementById(`detail-${symbol}-vol`);
    const highEl52 = document.getElementById(`detail-${symbol}-52h`);
    
    if (openEl) openEl.textContent = format(data.open);
    if (highEl) highEl.textContent = format(data.high);
    if (lowEl) lowEl.textContent = format(data.low);
    if (prevEl) prevEl.textContent = format(data.prevClose);
    if (volEl) volEl.textContent = (data.volume / 1000000).toFixed(1) + 'M';
    if (highEl52) highEl52.textContent = format(data.fiftyTwoWeekHigh);
}

function updateCryptoStats(symbol, data) {
    const highEl = document.getElementById(`detail-${symbol}-high`);
    const lowEl = document.getElementById(`detail-${symbol}-low`);
    const mcapEl = document.getElementById(`detail-${symbol}-mcap`);
    const volEl = document.getElementById(`detail-${symbol}-vol`);
    const athEl = document.getElementById(`detail-${symbol}-ath`);
    const domEl = document.getElementById(`detail-${symbol}-dom`);
    
    if (highEl) highEl.textContent = data.high ? `$${data.high.toLocaleString()}` : '--';
    if (lowEl) lowEl.textContent = data.low ? `$${data.low.toLocaleString()}` : '--';
    if (mcapEl) mcapEl.textContent = data.marketCap ? `$${(data.marketCap / 1e9).toFixed(0)}B` : '--';
    if (volEl) volEl.textContent = data.volume ? `$${(data.volume / 1e9).toFixed(1)}B` : '--';
    if (athEl) athEl.textContent = symbol === 'btc' ? '$108,000' : '--';
    if (domEl) domEl.textContent = symbol === 'btc' ? '57.2%' : '--';
}

function updateMarketStatus(symbol, type) {
    const statusEl = document.getElementById(`market-status-${symbol}`);
    if (!statusEl) return;
    
    if (type === 'crypto') {
        statusEl.textContent = '24/7';
        statusEl.className = 'market-status open';
        return;
    }
    
    const now = new Date();
    const hour = now.getUTCHours() - 5;
    const day = now.getUTCDay();
    const isIDStock = symbol === 'bbca';
    
    let isOpen;
    if (isIDStock) {
        const jakartaHour = now.getUTCHours() + 7;
        isOpen = day >= 1 && day <= 5 && jakartaHour >= 9 && jakartaHour < 16;
    } else {
        isOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 16;
    }
    
    statusEl.textContent = isOpen ? 'Market Open' : 'Market Closed';
    statusEl.className = `market-status ${isOpen ? 'open' : 'closed'}`;
}

function updateRecommendation(symbol, data, type) {
    const recEl = document.getElementById(`rec-${symbol.toLowerCase()}`);
    if (!recEl) return;
    
    const changePercent = data.changePercent || 0;
    let sentiment, recommendation;
    
    if (changePercent > 1) {
        sentiment = 'bullish';
        recommendation = `📈 <strong>BULLISH</strong> - ${symbol} naik ${changePercent.toFixed(2)}% ${type === 'crypto' ? 'dalam 24 jam' : 'hari ini'}. Momentum positif!`;
    } else if (changePercent < -1) {
        sentiment = 'bearish';
        recommendation = `📉 <strong>BEARISH</strong> - ${symbol} turun ${Math.abs(changePercent).toFixed(2)}% ${type === 'crypto' ? 'dalam 24 jam' : 'hari ini'}. Jangan panik selling, bisa jadi kesempatan beli.`;
    } else {
        sentiment = 'neutral';
        recommendation = `⚖️ <strong>NEUTRAL</strong> - ${symbol} relatif flat (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%). Market dalam konsolidasi.`;
    }
    
    recEl.className = `stock-recommendation ${sentiment}`;
    recEl.innerHTML = recommendation;
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            const targetId = link.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
            if (targetId === 'dashboard') updateWeeklyChart();
        });
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function getWeekRange(offset = 0) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff + (offset * 7)));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: startOfWeek, end: endOfWeek };
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getWeekTransactions(offset = 0) {
    const { start, end } = getWeekRange(offset);
    return transactions.filter(t => {
        const date = new Date(t.date);
        return date >= start && date <= end;
    });
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-date').value = today;
}

function initTransactionForm() {
    const form = document.getElementById('transaction-form');
    const typeSelect = document.getElementById('transaction-type');
    const categorySelect = document.getElementById('transaction-category');
    
    typeSelect.addEventListener('change', () => {
        const incomeCategories = document.getElementById('income-categories');
        const expenseCategories = document.getElementById('expense-categories');
        if (typeSelect.value === 'income') {
            incomeCategories.style.display = 'block';
            expenseCategories.style.display = 'none';
            categorySelect.value = 'gaji';
        } else {
            incomeCategories.style.display = 'none';
            expenseCategories.style.display = 'block';
            categorySelect.value = 'makanan';
        }
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const transaction = {
            id: Date.now(),
            type: document.getElementById('transaction-type').value,
            category: document.getElementById('transaction-category').value,
            amount: parseFormattedCurrency(document.getElementById('transaction-amount').value),
            description: document.getElementById('transaction-description').value,
            date: document.getElementById('transaction-date').value
        };
        transactions.push(transaction);
        saveTransactions();
        updateDashboard();
        renderTransactions();
        form.reset();
        setDefaultDate();
        typeSelect.dispatchEvent(new Event('change'));
        showToast('Transaksi berhasil ditambahkan!', 'success');
    });
}

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    updateDashboard();
    renderTransactions();
    showToast('Transaksi berhasil dihapus!', 'info');
}

function getCategoryLabel(category) {
    const labels = {
        'gaji': 'Gaji', 'bonus': 'Bonus', 'freelance': 'Freelance', 'investasi': 'Hasil Investasi', 'lainnya-masuk': 'Lainnya',
        'makanan': 'Makanan & Minuman', 'transportasi': 'Transportasi', 'belanja': 'Belanja', 'tagihan': 'Tagihan',
        'hiburan': 'Hiburan', 'kesehatan': 'Kesehatan', 'pendidikan': 'Pendidikan', 'lainnya-keluar': 'Lainnya'
    };
    return labels[category] || category;
}

function updateDashboard() {
    const weekTransactions = getWeekTransactions(0);
    const income = weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);
    
    document.getElementById('total-income').textContent = formatCurrency(income);
    document.getElementById('total-expense').textContent = formatCurrency(expense);
    document.getElementById('balance').textContent = formatCurrency(balance);
    
    if (emergencyFundData) {
        document.getElementById('emergency-fund').textContent = formatCurrency(emergencyFundData.current);
        document.getElementById('emergency-target').textContent = formatCurrency(emergencyFundData.target);
    }
    
    updateWeeklyChart();
    renderRecentTransactions();
}

function renderRecentTransactions() {
    const recentList = document.getElementById('recent-list');
    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    if (recent.length === 0) {
        recentList.innerHTML = '<p class="empty-state">Belum ada transaksi</p>';
        return;
    }
    
    recentList.innerHTML = recent.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${t.type}">
                    <i class="fas fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${t.description}</h4>
                    <span>${formatDate(t.date)} • ${getCategoryLabel(t.category)}</span>
                </div>
            </div>
            <span class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</span>
        </div>
    `).join('');
}

function renderTransactions() {
    const tbody = document.getElementById('transactions-body');
    const weekTransactions = getWeekTransactions(currentWeekOffset);
    
    if (weekTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada transaksi pada minggu ini</td></tr>';
        return;
    }
    
    tbody.innerHTML = weekTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td><span class="type-badge ${t.type}">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
            <td>${getCategoryLabel(t.category)}</td>
            <td>${t.description}</td>
            <td class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</td>
            <td><button class="btn btn-danger" onclick="deleteTransaction(${t.id})"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

function initWeekFilter() {
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');
    const display = document.getElementById('current-week-display');
    
    function updateDisplay() {
        const { start, end } = getWeekRange(currentWeekOffset);
        display.textContent = `${formatDate(start)} - ${formatDate(end)}`;
    }
    
    prevBtn.addEventListener('click', () => { currentWeekOffset--; updateDisplay(); renderTransactions(); });
    nextBtn.addEventListener('click', () => { currentWeekOffset++; updateDisplay(); renderTransactions(); });
    updateDisplay();
}

function updateWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    
    const weekTransactions = getWeekTransactions(0);
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const incomeData = [0, 0, 0, 0, 0, 0, 0];
    const expenseData = [0, 0, 0, 0, 0, 0, 0];
    
    weekTransactions.forEach(t => {
        const date = new Date(t.date);
        let dayIndex = date.getDay() - 1;
        if (dayIndex < 0) dayIndex = 6;
        if (t.type === 'income') incomeData[dayIndex] += t.amount;
        else expenseData[dayIndex] += t.amount;
    });
    
    if (weeklyChart) weeklyChart.destroy();
    
    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                { label: 'Pemasukan', data: incomeData, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderColor: 'rgb(16, 185, 129)', borderWidth: 1, borderRadius: 4 },
                { label: 'Pengeluaran', data: expenseData, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderColor: 'rgb(239, 68, 68)', borderWidth: 1, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': ' + formatCurrency(context.raw); } } } },
            scales: { y: { beginAtZero: true, ticks: { callback: function(value) { return formatCurrency(value); } } } }
        }
    });
}

function initEmergencyForm() {
    const form = document.getElementById('emergency-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const monthlyExpense = parseFormattedCurrency(document.getElementById('monthly-expense').value);
        const status = document.getElementById('status').value;
        const currentSavings = parseFormattedCurrency(document.getElementById('current-savings').value) || 0;
        
        let months;
        switch (status) {
            case 'single': months = 6; break;
            case 'married': months = 9; break;
            case 'family': months = 12; break;
            default: months = 6;
        }
        
        const target = monthlyExpense * months;
        const shortage = Math.max(0, target - currentSavings);
        const percentage = Math.min(100, (currentSavings / target) * 100);
        
        document.getElementById('target-emergency').textContent = formatCurrency(target);
        document.getElementById('current-emergency').textContent = formatCurrency(currentSavings);
        document.getElementById('shortage-emergency').textContent = formatCurrency(shortage);
        document.getElementById('percentage-emergency').textContent = percentage.toFixed(1) + '%';
        document.getElementById('emergency-progress').style.width = percentage + '%';
        document.getElementById('monthly-save-12').textContent = formatCurrency(shortage / 12);
        document.getElementById('monthly-save-24').textContent = formatCurrency(shortage / 24);
        
        emergencyFundData = { target: target, current: currentSavings, shortage: shortage, percentage: percentage };
        localStorage.setItem('emergencyFundData', JSON.stringify(emergencyFundData));
        generateEmergencyRecommendations(monthlyExpense, target, currentSavings, status);
        document.getElementById('emergency-result').classList.remove('hidden');
        updateDashboard();
        showToast('Dana darurat berhasil dihitung!', 'success');
    });
}

function generateEmergencyRecommendations(monthlyExpense, target, currentSavings, status) {
    const recContent = document.getElementById('emergency-rec-content');
    const percentage = (currentSavings / target) * 100;
    let recommendations = [];
    
    if (percentage >= 100) {
        recommendations.push('🎉 Selamat! Dana darurat Anda sudah mencapai target. Pertahankan dan pertimbangkan untuk mulai berinvestasi.');
    } else if (percentage >= 75) {
        recommendations.push('👍 Bagus! Dana darurat Anda sudah hampir mencapai target. Terus konsisten menabung.');
    } else if (percentage >= 50) {
        recommendations.push('💪 Anda sudah di pertengahan jalan. Tetap semangat menabung!');
    } else if (percentage >= 25) {
        recommendations.push('📈 Awal yang baik! Tingkatkan jumlah tabungan bulanan jika memungkinkan.');
    } else {
        recommendations.push('🚀 Mari mulai membangun dana darurat Anda. Sisihkan minimal 10% dari pendapatan.');
    }
    
    const statusLabel = status === 'single' ? 'lajang' : status === 'married' ? 'menikah tanpa anak' : 'keluarga dengan anak';
    recommendations.push(`💡 Sebagai ${statusLabel}, target ${status === 'single' ? '6' : status === 'married' ? '9' : '12'} bulan pengeluaran adalah standar yang direkomendasikan.`);
    recContent.innerHTML = recommendations.map(r => `<p>${r}</p>`).join('');
}

function initETFForm() {
    const form = document.getElementById('etf-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const initialInvestment = parseFormattedCurrency(document.getElementById('initial-investment').value) || 0;
        const monthlyInvestment = parseFormattedCurrency(document.getElementById('monthly-investment').value);
        const expectedReturn = parseFloat(document.getElementById('expected-return').value) / 100;
        const investmentPeriod = parseInt(document.getElementById('investment-period').value);
        const inflationRate = parseFloat(document.getElementById('inflation-rate').value) / 100;
        
        const monthlyReturn = expectedReturn / 12;
        const totalMonths = investmentPeriod * 12;
        const fvInitial = initialInvestment * Math.pow(1 + monthlyReturn, totalMonths);
        let fvMonthly = 0;
        if (monthlyReturn > 0) {
            fvMonthly = monthlyInvestment * ((Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn) * (1 + monthlyReturn);
        } else {
            fvMonthly = monthlyInvestment * totalMonths;
        }
        
        const finalValue = fvInitial + fvMonthly;
        const totalInvested = initialInvestment + (monthlyInvestment * totalMonths);
        const totalProfit = finalValue - totalInvested;
        const roi = ((finalValue - totalInvested) / totalInvested) * 100;
        const realValue = finalValue / Math.pow(1 + inflationRate, investmentPeriod);
        const realProfit = realValue - totalInvested;
        
        document.getElementById('final-value').textContent = formatCurrency(finalValue);
        document.getElementById('total-invested').textContent = formatCurrency(totalInvested);
        document.getElementById('total-profit').textContent = formatCurrency(totalProfit);
        document.getElementById('roi').textContent = roi.toFixed(2) + '%';
        document.getElementById('real-value').textContent = formatCurrency(realValue);
        document.getElementById('real-profit').textContent = formatCurrency(realProfit);
        
        generateYearlyBreakdown(initialInvestment, monthlyInvestment, monthlyReturn, investmentPeriod);
        updateInvestmentChart(initialInvestment, monthlyInvestment, monthlyReturn, investmentPeriod);
        generateETFRecommendations(finalValue, totalInvested, roi, investmentPeriod, monthlyInvestment, expectedReturn * 100);
        document.getElementById('etf-result').classList.remove('hidden');
        showToast('Simulasi investasi berhasil dihitung!', 'success');
    });
}

function generateYearlyBreakdown(initial, monthly, monthlyReturn, years) {
    const tbody = document.getElementById('yearly-table');
    let rows = '';
    let balance = initial;
    
    for (let year = 1; year <= years; year++) {
        for (let month = 1; month <= 12; month++) {
            balance = balance * (1 + monthlyReturn) + monthly;
        }
        const totalInvested = initial + (monthly * 12 * year);
        const profit = balance - totalInvested;
        rows += `<tr><td>Tahun ${year}</td><td>${formatCurrency(totalInvested)}</td><td>${formatCurrency(balance)}</td><td class="profit">${formatCurrency(profit)}</td></tr>`;
    }
    tbody.innerHTML = rows;
}

function updateInvestmentChart(initial, monthly, monthlyReturn, years) {
    const ctx = document.getElementById('investmentChart');
    if (!ctx) return;
    
    const labels = [];
    const investedData = [];
    const valueData = [];
    let balance = initial;
    
    for (let year = 0; year <= years; year++) {
        labels.push(year === 0 ? 'Awal' : `Tahun ${year}`);
        if (year === 0) {
            investedData.push(initial);
            valueData.push(initial);
        } else {
            for (let month = 1; month <= 12; month++) {
                balance = balance * (1 + monthlyReturn) + monthly;
            }
            investedData.push(initial + (monthly * 12 * year));
            valueData.push(balance);
        }
    }
    
    if (investmentChart) investmentChart.destroy();
    
    investmentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Total Diinvestasikan', data: investedData, borderColor: 'rgb(99, 102, 241)', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.4 },
                { label: 'Nilai Investasi', data: valueData, borderColor: 'rgb(16, 185, 129)', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': ' + formatCurrency(context.raw); } } } },
            scales: { y: { beginAtZero: true, ticks: { callback: function(value) { return formatCurrency(value); } } } }
        }
    });
}

function generateETFRecommendations(finalValue, totalInvested, roi, years, monthly, returnRate) {
    const recContent = document.getElementById('etf-rec-content');
    let recommendations = [];
    
    if (roi > 100) recommendations.push('🚀 Investasi Anda berpotensi menghasilkan return lebih dari 100%! Compound interest bekerja dengan baik.');
    if (years >= 10) recommendations.push('⏰ Investasi jangka panjang (10+ tahun) adalah strategi yang sangat baik untuk memaksimalkan compound interest.');
    if (returnRate >= 10) recommendations.push('📊 Return 10%+ adalah ekspektasi yang optimis. Pastikan untuk diversifikasi portofolio.');
    if (monthly >= 1000000) recommendations.push('💰 Investasi bulanan Rp 1 juta+ menunjukkan komitmen yang baik untuk masa depan finansial.');
    recommendations.push('📈 Tips: Konsistensi lebih penting dari timing market. Terus berinvestasi dalam kondisi apapun (DCA).');
    recContent.innerHTML = recommendations.map(r => `<p>${r}</p>`).join('');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}
