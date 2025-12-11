
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let emergencyFundData = JSON.parse(localStorage.getItem('emergencyFundData')) || null;
let currentWeekOffset = 0;
let weeklyChart = null;
let investmentChart = null;
let marketDataCache = {};

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
});

function initCurrencyInputs() {
    const currencyInputs = document.querySelectorAll('.currency-input');
    
    currencyInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            formatCurrencyInput(e.target);
        });
        
        input.addEventListener('blur', (e) => {
            formatCurrencyInput(e.target);
        });
        
        input.addEventListener('focus', (e) => {
            setTimeout(() => e.target.select(), 0);
        });
        
        input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                e.preventDefault();
            }
        });
        
        if (input.value && input.value !== '0') {
            formatCurrencyInput(input);
        }
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
    
    setTimeout(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
}

function formatNumberWithComma(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function parseFormattedCurrency(str) {
    if (!str) return 0;
    return parseInt(str.replace(/[^\d]/g, '')) || 0;
}

async function initMarketData() {
    await fetchAllMarketData();
    setInterval(fetchAllMarketData, 60000);
}

async function fetchAllMarketData() {
    const usSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'GOOGL'];
    
    const idSymbols = ['IHSG', 'BBCA', 'BBRI', 'TLKM', 'ASII', 'GOTO'];
    
    updateTickerTime();
    
    for (const symbol of usSymbols) {
        await fetchStockData(symbol, 'US');
    }
    
    for (const symbol of idSymbols) {
        await fetchStockData(symbol, 'ID');
    }
    
    await fetchCryptoData();
    
    updateSPYDetailCard();
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
        'SPY': 607.50,
        'QQQ': 525.75,
        'AAPL': 248.50,
        'MSFT': 448.20,
        'NVDA': 138.50,
        'GOOGL': 187.40,
        'IHSG': 7285,
        'BBCA': 10125,
        'BBRI': 4650,
        'TLKM': 2820,
        'ASII': 4850,
        'GOTO': 84
    };
    
    const basePrice = basePrices[symbol] || 100;
    const isIDStock = market === 'ID';
    
    const volatility = {
        'SPY': 0.008, 'QQQ': 0.01, 'AAPL': 0.012, 'MSFT': 0.011, 
        'NVDA': 0.025, 'GOOGL': 0.013,
        'IHSG': 0.008, 'BBCA': 0.012, 'BBRI': 0.015, 
        'TLKM': 0.01, 'ASII': 0.012, 'GOTO': 0.03
    };
    
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
            currentPrice = Math.round(currentPrice / 25) * 25; // IDX tick size
            prevClose = Math.round(prevClose / 25) * 25;
        }
    }
    
    const change = currentPrice - prevClose;
    const changePercent = (change / prevClose) * 100;
    
    const dayRange = Math.abs(change) + basePrice * vol;
    const high = Math.max(currentPrice, prevClose) + Math.random() * dayRange;
    const low = Math.min(currentPrice, prevClose) - Math.random() * dayRange;
    const open = prevClose + (Math.random() - 0.5) * basePrice * vol;
    
    return {
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        open: open,
        high: high,
        low: low,
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
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
        
        if (response.ok) {
            const data = await response.json();
            
            const btcData = {
                price: data.bitcoin.usd,
                changePercent: data.bitcoin.usd_24h_change || 0
            };
            updateCryptoUI('btc', btcData);
            
            const ethData = {
                price: data.ethereum.usd,
                changePercent: data.ethereum.usd_24h_change || 0
            };
            updateCryptoUI('eth', ethData);
        }
    } catch (error) {
        console.error('Error fetching Crypto:', error);
        updateCryptoUI('btc', {
            price: 101500 + (Math.random() - 0.5) * 2000,
            changePercent: (Math.random() - 0.5) * 4
        });
        updateCryptoUI('eth', {
            price: 3950 + (Math.random() - 0.5) * 100,
            changePercent: (Math.random() - 0.5) * 5
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
        priceEl.className = 'ticker-price idr';
    } else {
        priceEl.textContent = `$${data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        priceEl.className = 'ticker-price';
    }
    
    priceEl.classList.add('price-flash');
    setTimeout(() => priceEl.classList.remove('price-flash'), 500);
    
    const changeSign = isUp ? '+' : '';
    if (isIDStock) {
        changeEl.innerHTML = `
            <span class="change-value">${changeSign}${formatIDR(Math.round(data.change))}</span>
            <span class="change-percent">${changeSign}${data.changePercent.toFixed(2)}%</span>
        `;
    } else {
        changeEl.innerHTML = `
            <span class="change-value">${changeSign}$${Math.abs(data.change).toFixed(2)}</span>
            <span class="change-percent">${changeSign}${data.changePercent.toFixed(2)}%</span>
        `;
    }
    
    changeEl.className = `ticker-change ${isUp ? 'up' : 'down'}`;
    if (tickerItem) {
        tickerItem.className = `ticker-item ${isUp ? 'up' : 'down'}`;
    }
}

function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function updateCryptoUI(symbol, data) {
    const priceEl = document.getElementById(`${symbol}-price`);
    const changeEl = document.getElementById(`${symbol}-change`);
    const tickerItem = document.getElementById(`${symbol}-ticker`);
    
    if (!priceEl || !changeEl) return;
    
    const isUp = data.changePercent >= 0;
    
    priceEl.textContent = `$${data.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    priceEl.className = 'ticker-price';
    
    const changeSign = isUp ? '+' : '';
    changeEl.innerHTML = `
        <span class="change-value">${changeSign}${data.changePercent.toFixed(2)}%</span>
        <span class="change-percent">24h</span>
    `;
    
    changeEl.className = `ticker-change ${isUp ? 'up' : 'down'}`;
    if (tickerItem) {
        tickerItem.className = `ticker-item ${isUp ? 'up' : 'down'}`;
    }
}

function updateBitcoinUI(data) {
    updateCryptoUI('btc', data);
}

function updateTickerTime() {
    const timeEl = document.getElementById('ticker-update-time');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = `Update: ${now.toLocaleTimeString('id-ID')}`;
    }
}

function updateSPYDetailCard() {
    const spyData = marketDataCache['SPY'];
    if (!spyData) return;
    
    const isUp = spyData.change >= 0;
    
    const priceEl = document.getElementById('spy-price-large');
    if (priceEl) {
        priceEl.textContent = spyData.price.toFixed(2);
    }
    
    const changeEl = document.getElementById('spy-change-large');
    if (changeEl) {
        const sign = isUp ? '+' : '';
        changeEl.innerHTML = `
            <i class="fas fa-${isUp ? 'caret-up' : 'caret-down'}"></i>
            <span class="change-amount">${sign}$${spyData.change.toFixed(2)}</span>
            <span class="change-pct">(${sign}${spyData.changePercent.toFixed(2)}%)</span>
        `;
        changeEl.className = `spy-change-large ${isUp ? 'up' : 'down'}`;
    }
    
    document.getElementById('spy-open').textContent = `$${spyData.open.toFixed(2)}`;
    document.getElementById('spy-high').textContent = `$${spyData.high.toFixed(2)}`;
    document.getElementById('spy-low').textContent = `$${spyData.low.toFixed(2)}`;
    document.getElementById('spy-prev-close').textContent = `$${spyData.prevClose.toFixed(2)}`;
    document.getElementById('spy-volume').textContent = formatVolume(spyData.volume);
    document.getElementById('spy-52w-high').textContent = `$${spyData.fiftyTwoWeekHigh.toFixed(2)}`;
    
    updateMarketStatus();
    
    updateSPYRecommendation(spyData);
}

function formatVolume(volume) {
    if (volume >= 1000000000) {
        return (volume / 1000000000).toFixed(2) + 'B';
    } else if (volume >= 1000000) {
        return (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
        return (volume / 1000).toFixed(2) + 'K';
    }
    return volume.toString();
}

function updateMarketStatus() {
    const statusEl = document.getElementById('market-status');
    if (!statusEl) return;
    
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const day = nyTime.getDay();
    
    const isWeekday = day >= 1 && day <= 5;
    const marketTime = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    const preMarketStart = 4 * 60; // 4:00 AM
    const afterHoursEnd = 20 * 60; // 8:00 PM
    
    if (!isWeekday) {
        statusEl.textContent = '🔴 Market Closed';
        statusEl.className = 'market-status closed';
    } else if (marketTime >= marketOpen && marketTime < marketClose) {
        statusEl.textContent = '🟢 Market Open';
        statusEl.className = 'market-status open';
    } else if (marketTime >= preMarketStart && marketTime < marketOpen) {
        statusEl.textContent = '🟡 Pre-Market';
        statusEl.className = 'market-status pre-market';
    } else if (marketTime >= marketClose && marketTime < afterHoursEnd) {
        statusEl.textContent = '🟡 After-Hours';
        statusEl.className = 'market-status pre-market';
    } else {
        statusEl.textContent = '🔴 Market Closed';
        statusEl.className = 'market-status closed';
    }
}

function updateSPYRecommendation(data) {
    const recEl = document.getElementById('spy-recommendation');
    if (!recEl) return;
    
    const changePercent = data.changePercent;
    const priceVsHigh = ((data.price / data.fiftyTwoWeekHigh) * 100);
    
    let recommendation = '';
    let sentiment = 'neutral';
    
    if (changePercent > 1.5) {
        sentiment = 'bullish';
        recommendation = `📈 <strong>BULLISH</strong> - SPY naik ${changePercent.toFixed(2)}% hari ini! Momentum positif kuat. Pertimbangkan untuk hold atau tambah posisi secara bertahap dengan DCA.`;
    } else if (changePercent > 0.5) {
        sentiment = 'bullish';
        recommendation = `📈 <strong>Slightly Bullish</strong> - SPY naik ${changePercent.toFixed(2)}%. Market menunjukkan sinyal positif. Waktu yang baik untuk investasi rutin.`;
    } else if (changePercent < -1.5) {
        sentiment = 'bearish';
        recommendation = `📉 <strong>BEARISH</strong> - SPY turun ${Math.abs(changePercent).toFixed(2)}% hari ini. Ini bisa menjadi kesempatan membeli (buy the dip) jika horizon investasi panjang.`;
    } else if (changePercent < -0.5) {
        sentiment = 'bearish';
        recommendation = `📉 <strong>Slightly Bearish</strong> - SPY turun ${Math.abs(changePercent).toFixed(2)}%. Volatilitas normal. Tetap tenang dan lanjutkan strategi DCA.`;
    } else {
        sentiment = 'neutral';
        recommendation = `⚖️ <strong>NEUTRAL</strong> - SPY relatif flat (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%). Market dalam konsolidasi. Tetap konsisten dengan rencana investasi.`;
    }
    
    if (priceVsHigh > 98) {
        recommendation += ` <span style="color: #fbbf24;">⚠️ Dekat dengan 52-week high (${priceVsHigh.toFixed(1)}%).</span>`;
    } else if (priceVsHigh < 85) {
        recommendation += ` <span style="color: #22c55e;">💡 Jauh dari 52-week high - potensi nilai baik.</span>`;
    }
    
    recEl.className = `spy-recommendation ${sentiment}`;
    recEl.innerHTML = `
        <div class="rec-indicator"></div>
        <span class="rec-text">${recommendation}</span>
    `;
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            
            link.classList.add('active');
            
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            const targetId = link.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
            
            if (targetId === 'dashboard') {
                updateWeeklyChart();
            }
        });
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function parseCurrency(str) {
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
}

function getWeekRange(offset = 0) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
    
    const startOfWeek = new Date(now.setDate(diff + (offset * 7)));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { start: startOfWeek, end: endOfWeek };
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
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
    showToast('Transaksi berhasil dihapus!', 'success');
}

function renderTransactions() {
    const tbody = document.getElementById('transactions-body');
    const weekTransactions = getWeekTransactions(currentWeekOffset);
    
    if (weekTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada transaksi untuk minggu ini</td></tr>';
        return;
    }
    
    weekTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = weekTransactions.map(t => `
        <tr class="${t.type === 'income' ? 'income-row' : 'expense-row'}">
            <td>${formatDate(t.date)}</td>
            <td>${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
            <td>${getCategoryLabel(t.category)}</td>
            <td>${t.description}</td>
            <td>${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</td>
            <td>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getCategoryLabel(category) {
    const labels = {
        'gaji': 'Gaji',
        'bonus': 'Bonus',
        'freelance': 'Freelance',
        'investasi': 'Hasil Investasi',
        'lainnya-masuk': 'Lainnya',
        'makanan': 'Makanan & Minuman',
        'transportasi': 'Transportasi',
        'belanja': 'Belanja',
        'tagihan': 'Tagihan',
        'hiburan': 'Hiburan',
        'kesehatan': 'Kesehatan',
        'pendidikan': 'Pendidikan',
        'lainnya-keluar': 'Lainnya'
    };
    return labels[category] || category;
}

function updateDashboard() {
    const weekTransactions = getWeekTransactions(0); // Current week
    
    const income = weekTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = weekTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = transactions.reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
    }, 0);
    
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
            <span class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
            </span>
        </div>
    `).join('');
}

function initWeekFilter() {
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');
    const display = document.getElementById('current-week-display');
    
    function updateWeekDisplay() {
        const { start, end } = getWeekRange(currentWeekOffset);
        display.textContent = `${formatDate(start)} - ${formatDate(end)}`;
    }
    
    prevBtn.addEventListener('click', () => {
        currentWeekOffset--;
        updateWeekDisplay();
        renderTransactions();
    });
    
    nextBtn.addEventListener('click', () => {
        currentWeekOffset++;
        updateWeekDisplay();
        renderTransactions();
    });
    
    updateWeekDisplay();
}

function updateWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const { start } = getWeekRange(0);
    
    const incomeData = new Array(7).fill(0);
    const expenseData = new Array(7).fill(0);
    
    const weekTransactions = getWeekTransactions(0);
    
    weekTransactions.forEach(t => {
        const date = new Date(t.date);
        let dayIndex = date.getDay() - 1;
        if (dayIndex < 0) dayIndex = 6; // Sunday
        
        if (t.type === 'income') {
            incomeData[dayIndex] += t.amount;
        } else {
            expenseData[dayIndex] += t.amount;
        }
    });
    
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Pengeluaran',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
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
            case 'single':
                months = 6;
                break;
            case 'married':
                months = 9;
                break;
            case 'family':
                months = 12;
                break;
            default:
                months = 6;
        }
        
        const target = monthlyExpense * months;
        const shortage = Math.max(0, target - currentSavings);
        const percentage = Math.min(100, (currentSavings / target) * 100);
        
        const save12 = shortage / 12;
        const save24 = shortage / 24;
        
        document.getElementById('target-emergency').textContent = formatCurrency(target);
        document.getElementById('current-emergency').textContent = formatCurrency(currentSavings);
        document.getElementById('shortage-emergency').textContent = formatCurrency(shortage);
        document.getElementById('percentage-emergency').textContent = percentage.toFixed(1) + '%';
        document.getElementById('emergency-progress').style.width = percentage + '%';
        document.getElementById('monthly-save-12').textContent = formatCurrency(save12);
        document.getElementById('monthly-save-24').textContent = formatCurrency(save24);
        
        document.getElementById('emergency-result').classList.remove('hidden');
        
        generateEmergencyRecommendations(target, currentSavings, monthlyExpense, status);
        
        emergencyFundData = { target, current: currentSavings };
        localStorage.setItem('emergencyFundData', JSON.stringify(emergencyFundData));
        
        document.getElementById('emergency-fund').textContent = formatCurrency(currentSavings);
        document.getElementById('emergency-target').textContent = formatCurrency(target);
        
        showToast('Dana darurat berhasil dihitung!', 'success');
    });
}

function initETFForm() {
    const form = document.getElementById('etf-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const initialInvestment = parseFormattedCurrency(document.getElementById('initial-investment').value) || 0;
        const monthlyInvestment = parseFormattedCurrency(document.getElementById('monthly-investment').value);
        const expectedReturn = parseFloat(document.getElementById('expected-return').value) / 100; // Convert to decimal
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
        const yearStart = balance;
        
        for (let month = 1; month <= 12; month++) {
            balance = balance * (1 + monthlyReturn) + monthly;
        }
        
        const totalInvested = initial + (monthly * 12 * year);
        const profit = balance - totalInvested;
        
        rows += `
            <tr>
                <td>Tahun ${year}</td>
                <td>${formatCurrency(totalInvested)}</td>
                <td>${formatCurrency(balance)}</td>
                <td class="profit">${formatCurrency(profit)}</td>
            </tr>
        `;
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
    
    if (investmentChart) {
        investmentChart.destroy();
    }
    
    investmentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Nilai Investasi',
                    data: valueData,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Total Diinvestasikan',
                    data: investedData,
                    borderColor: 'rgb(148, 163, 184)',
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000000) {
                                return 'Rp ' + (value / 1000000000).toFixed(1) + 'M';
                            } else if (value >= 1000000) {
                                return 'Rp ' + (value / 1000000).toFixed(0) + 'jt';
                            }
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function generateEmergencyRecommendations(target, current, monthlyExpense, status) {
    const percentage = (current / target) * 100;
    const shortage = target - current;
    
    let recommendations = [];
    
    if (percentage >= 100) {
        recommendations.push({
            type: 'success',
            icon: 'trophy',
            title: '🎉 Selamat! Dana Darurat Tercapai!',
            text: `Dana darurat Anda sudah mencapai ${percentage.toFixed(0)}% dari target. Pertahankan dan pertimbangkan untuk mulai berinvestasi untuk tujuan jangka panjang.`
        });
    } else if (percentage >= 75) {
        recommendations.push({
            type: 'info',
            icon: 'thumbs-up',
            title: '👍 Hampir Sampai!',
            text: `Progress sangat baik! Anda sudah mencapai ${percentage.toFixed(0)}%. Kekurangan hanya ${formatCurrency(shortage)}. Tetap konsisten menabung!`
        });
    } else if (percentage >= 50) {
        recommendations.push({
            type: 'info',
            icon: 'chart-line',
            title: '📈 Progress Bagus!',
            text: `Anda sudah separuh jalan dengan ${percentage.toFixed(0)}% tercapai. Pertimbangkan untuk menambah jumlah tabungan bulanan jika memungkinkan.`
        });
    } else if (percentage >= 25) {
        recommendations.push({
            type: 'warning',
            icon: 'exclamation-triangle',
            title: '⚠️ Perlu Ditingkatkan',
            text: `Progress baru ${percentage.toFixed(0)}%. Fokuskan penghasilan untuk membangun dana darurat terlebih dahulu sebelum investasi agresif.`
        });
    } else {
        recommendations.push({
            type: 'warning',
            icon: 'exclamation-circle',
            title: '🚨 Prioritaskan Dana Darurat',
            text: `Progress masih ${percentage.toFixed(0)}%. Dana darurat adalah fondasi keuangan. Alokasikan minimal 10-20% penghasilan untuk dana darurat.`
        });
    }
    
    if (status === 'family') {
        recommendations.push({
            type: 'info',
            icon: 'users',
            title: '👨‍👩‍👧‍👦 Tips untuk Keluarga',
            text: 'Sebagai pencari nafkah utama, pastikan memiliki asuransi jiwa dan kesehatan yang memadai selain dana darurat.'
        });
    } else if (status === 'married') {
        recommendations.push({
            type: 'info',
            icon: 'heart',
            title: '💑 Tips untuk Pasangan',
            text: 'Buat target bersama pasangan dan alokasikan dari kedua penghasilan untuk mencapai target lebih cepat.'
        });
    } else {
        recommendations.push({
            type: 'info',
            icon: 'user',
            title: '💡 Tips untuk Single',
            text: 'Ini waktu terbaik membangun dana darurat karena tanggungan masih sedikit. Manfaatkan dengan maksimal!'
        });
    }
    
    recommendations.push({
        type: 'info',
        icon: 'lightbulb',
        title: '💰 Strategi Alokasi',
        text: `Simpan 20% di tabungan (${formatCurrency(target * 0.2)}) untuk likuiditas tinggi, 30% di deposito (${formatCurrency(target * 0.3)}), dan 50% di RDPU (${formatCurrency(target * 0.5)}) untuk return optimal.`
    });
    
    const container = document.getElementById('emergency-rec-content');
    container.innerHTML = recommendations.map(rec => `
        <div class="rec-item ${rec.type}">
            <h5><i class="fas fa-${rec.icon}"></i> ${rec.title}</h5>
            <p>${rec.text}</p>
        </div>
    `).join('');
}

function generateETFRecommendations(finalValue, totalInvested, roi, investmentPeriod, monthlyInvestment, expectedReturn) {
    let recommendations = [];
    
    if (investmentPeriod <= 3) {
        recommendations.push({
            type: 'warning',
            icon: 'clock',
            title: '⏰ Horizon Pendek - Pertimbangkan Risiko',
            text: `Investasi ${investmentPeriod} tahun relatif pendek untuk ETF saham. Pertimbangkan alokasi yang lebih konservatif: 50% ETF, 30% obligasi/RDPU, 20% deposito untuk mengurangi risiko volatilitas.`
        });
    } else if (investmentPeriod <= 10) {
        recommendations.push({
            type: 'info',
            icon: 'balance-scale',
            title: '⚖️ Strategi Moderat Disarankan',
            text: `Untuk horizon ${investmentPeriod} tahun, strategi moderat cocok: 60% ETF saham, 30% obligasi, 10% kas. Lakukan rebalancing tahunan.`
        });
    } else {
        recommendations.push({
            type: 'success',
            icon: 'rocket',
            title: '🚀 Horizon Panjang - Strategi Agresif',
            text: `Dengan horizon ${investmentPeriod} tahun, Anda bisa lebih agresif: 80% ETF saham, 15% obligasi, 5% kas. Waktu akan membantu mengatasi volatilitas jangka pendek.`
        });
    }
    
    if (monthlyInvestment < 500000) {
        recommendations.push({
            type: 'info',
            icon: 'piggy-bank',
            title: '💡 Mulai dari Sedikit',
            text: `Investasi ${formatCurrency(monthlyInvestment)}/bulan adalah awal yang baik! Tingkatkan secara bertahap seiring kenaikan penghasilan. Target minimal 10-20% dari penghasilan.`
        });
    } else if (monthlyInvestment >= 500000 && monthlyInvestment < 2000000) {
        recommendations.push({
            type: 'info',
            icon: 'chart-line',
            title: '📈 Konsistensi Adalah Kunci',
            text: `Investasi ${formatCurrency(monthlyInvestment)}/bulan sangat baik! Pertahankan konsistensi dan jangan panic selling saat market turun.`
        });
    } else {
        recommendations.push({
            type: 'success',
            icon: 'gem',
            title: '💎 Investor Serius',
            text: `Dengan investasi ${formatCurrency(monthlyInvestment)}/bulan, pertimbangkan diversifikasi ke beberapa ETF berbeda atau tambahkan ETF obligasi untuk balance.`
        });
    }
    
    if (expectedReturn >= 12) {
        recommendations.push({
            type: 'warning',
            icon: 'exclamation-triangle',
            title: '⚠️ Ekspektasi Return Tinggi',
            text: `Return ${expectedReturn}%/tahun cukup optimis. Return historis rata-rata ETF Indonesia sekitar 8-12%/tahun. Pertimbangkan skenario konservatif juga.`
        });
    }
    
    recommendations.push({
        type: 'info',
        icon: 'calendar-check',
        title: '📅 Dollar Cost Averaging (DCA)',
        text: 'Investasi rutin setiap bulan (DCA) mengurangi risiko timing pasar. Set autodebit di tanggal gajian untuk disiplin investasi.'
    });
    
    recommendations.push({
        type: 'info',
        icon: 'list-check',
        title: '🎯 Pilihan ETF Rekomendasi',
        text: `
            <strong>Pemula:</strong> R-LQ45X (likuid, expense ratio rendah)<br>
            <strong>Growth:</strong> XIIT (fokus growth stocks)<br>
            <strong>Diversifikasi:</strong> Kombinasi XIJI + XISI<br>
            <strong>ESG:</strong> XISI (SRI-KEHATI, sustainable investing)
        `
    });
    
    recommendations.push({
        type: 'info',
        icon: 'percentage',
        title: '📊 Pertimbangan Pajak',
        text: 'Dividen ETF dikenakan pajak 10% (final). Capital gain dari penjualan dikenakan pajak 0.1% dari nilai transaksi. ETF lebih efisien pajak dibanding reksa dana konvensional.'
    });
    
    const container = document.getElementById('etf-rec-content');
    container.innerHTML = recommendations.map(rec => `
        <div class="rec-item ${rec.type}">
            <h5><i class="fas fa-${rec.icon}"></i> ${rec.title}</h5>
            <p>${rec.text}</p>
        </div>
    `).join('');
}

window.deleteTransaction = deleteTransaction;
