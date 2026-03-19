// Trading Simulator Application
// Data Storage
let currentUser = null;
let users = JSON.parse(localStorage.getItem('tradingUsers')) || {};
let marketData = {};
let priceUpdateInterval = null;
let currentTradeStock = null;
let currentTradeType = 'buy';

// Use comprehensive NSE stock data from stocks-data.js
const stocksData = typeof nseStocksData !== 'undefined' ? nseStocksData : [];

// Derivatives Data (Futures & Options)
const derivativesData = [
    { symbol: 'NIFTY50-FUT', name: 'Nifty 50 Future', basePrice: 21850.50, type: 'Future', expiry: '2026-03-26' },
    { symbol: 'BANKNIFTY-FUT', name: 'Bank Nifty Future', basePrice: 47250.75, type: 'Future', expiry: '2026-03-26' },
    { symbol: 'RELIANCE-FUT', name: 'Reliance Future', basePrice: 2455.25, type: 'Future', expiry: '2026-03-26' },
    { symbol: 'NIFTY-22000-CE', name: 'Nifty 22000 Call', basePrice: 185.50, type: 'Call Option', strike: 22000 },
    { symbol: 'NIFTY-21500-PE', name: 'Nifty 21500 Put', basePrice: 125.75, type: 'Put Option', strike: 21500 },
    { symbol: 'BANKNIFTY-48000-CE', name: 'Bank Nifty 48000 Call', basePrice: 320.40, type: 'Call Option', strike: 48000 },
    { symbol: 'BANKNIFTY-46000-PE', name: 'Bank Nifty 46000 Put', basePrice: 280.60, type: 'Put Option', strike: 46000 }
];

// Initialize Market Data
function initializeMarketData() {
    stocksData.forEach(stock => {
        marketData[stock.symbol] = {
            ...stock,
            currentPrice: stock.basePrice,
            previousClose: stock.basePrice,
            change: 0,
            changePercent: 0,
            high: stock.basePrice,
            low: stock.basePrice
        };
    });
    
    derivativesData.forEach(derivative => {
        marketData[derivative.symbol] = {
            ...derivative,
            currentPrice: derivative.basePrice,
            previousClose: derivative.basePrice,
            change: 0,
            changePercent: 0,
            high: derivative.basePrice,
            low: derivative.basePrice
        };
    });
}

// Authentication Functions
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function register() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const name = document.getElementById('reg-name').value.trim();
    
    console.log('Registration attempt for username:', username);
    
    if (!username || !password || !name) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Reload users to check for existing username
    users = JSON.parse(localStorage.getItem('tradingUsers')) || {};
    
    if (users[username]) {
        alert('Username already exists. Please choose a different username.');
        return;
    }
    
    users[username] = {
        username,
        password,
        name,
        balance: 100000, // Starting with ₹1,00,000
        portfolio: {},
        orders: [],
        transactions: [],
        realizedPnL: 0, // Track realized profit/loss from completed trades
        watchlist: {
            stocks: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'], // Default watchlist
            derivatives: ['NIFTY50-FUT', 'BANKNIFTY-FUT']
        },
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('tradingUsers', JSON.stringify(users));
    console.log('User registered successfully:', username);
    console.log('Total users now:', Object.keys(users).length);
    
    // Clear form fields
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-confirm-password').value = '';
    document.getElementById('reg-name').value = '';
    
    alert(`Account created successfully for "${username}"!\n\nYou can now login with:\nUsername: ${username}\nPassword: (the password you just entered)`);
    showLogin();
    
    // Pre-fill username in login form
    document.getElementById('login-username').value = username;
}

function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    console.log('Login attempt for username:', username);
    
    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }
    
    // Reload users from localStorage to ensure we have the latest data
    users = JSON.parse(localStorage.getItem('tradingUsers')) || {};
    
    console.log('Available users:', Object.keys(users));
    console.log('User exists:', !!users[username]);
    
    if (!users[username]) {
        alert(`Username "${username}" not found. Please register first or check your username.`);
        return;
    }
    
    if (users[username].password !== password) {
        alert('Incorrect password. Please try again.');
        return;
    }
    
    console.log('Login successful!');
    currentUser = username;
    localStorage.setItem('currentUser', username);
    showDashboard();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    stopPriceUpdates();
    
    // Hide dashboard
    const dashboardScreen = document.getElementById('dashboard-screen');
    dashboardScreen.style.display = 'none';
    dashboardScreen.classList.remove('active');
    
    // Show auth screen
    const authScreen = document.getElementById('auth-screen');
    authScreen.style.display = 'flex';
    authScreen.classList.add('active');
    
    showLogin();
}

function showDashboard() {
    console.log('Showing dashboard...');
    
    const authScreen = document.getElementById('auth-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    
    console.log('Auth screen:', authScreen);
    console.log('Dashboard screen:', dashboardScreen);
    
    // Hide auth screen
    authScreen.style.display = 'none';
    authScreen.classList.remove('active');
    
    // Show dashboard screen
    dashboardScreen.style.display = 'block';
    dashboardScreen.classList.add('active');
    
    console.log('Dashboard display:', dashboardScreen.style.display);
    
    document.getElementById('user-name').textContent = users[currentUser].name;
    
    updateAccountSummary();
    renderStocksList();
    renderDerivativesList();
    renderHoldings();
    renderPositions();
    renderDashboard();
    renderOrders();
    renderTransactions();
    startPriceUpdates();
    
    console.log('Dashboard loaded successfully!');
}

// Navigation Functions
function showSection(section) {
    // Update menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
    
    // Refresh data for the section
    if (section === 'holdings') renderHoldings();
    if (section === 'positions') renderPositions();
    if (section === 'dashboard') renderDashboard();
    if (section === 'orders') renderOrders();
    if (section === 'funds') renderTransactions();
}

function showMarketTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.market-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// Account Summary
function updateAccountSummary() {
    const user = users[currentUser];
    
    // Initialize realizedPnL if it doesn't exist (for old accounts)
    if (user.realizedPnL === undefined) {
        user.realizedPnL = 0;
    }
    
    const portfolioValue = calculatePortfolioValue();
    const unrealizedPnL = calculateTotalPnL(); // P&L from current holdings
    const totalPnL = unrealizedPnL + user.realizedPnL; // Total = unrealized + realized
    const dayPnL = calculateDayPnL();
    
    document.getElementById('available-balance').textContent = `₹${user.balance.toFixed(2)}`;
    document.getElementById('portfolio-value').textContent = `₹${portfolioValue.toFixed(2)}`;
    
    const totalPnLElement = document.getElementById('total-pnl');
    totalPnLElement.textContent = `₹${totalPnL.toFixed(2)}`;
    totalPnLElement.className = 'summary-value ' + (totalPnL >= 0 ? 'positive' : 'negative');
    
    const dayPnLElement = document.getElementById('day-pnl');
    dayPnLElement.textContent = `₹${dayPnL.toFixed(2)}`;
    dayPnLElement.className = 'summary-value ' + (dayPnL >= 0 ? 'positive' : 'negative');
}

function calculatePortfolioValue() {
    const user = users[currentUser];
    let total = 0;
    
    for (const symbol in user.portfolio) {
        const holding = user.portfolio[symbol];
        const currentPrice = marketData[symbol].currentPrice;
        total += holding.quantity * currentPrice;
    }
    
    return total;
}

function calculateTotalPnL() {
    const user = users[currentUser];
    let totalPnL = 0;
    
    for (const symbol in user.portfolio) {
        const holding = user.portfolio[symbol];
        const currentPrice = marketData[symbol].currentPrice;
        const invested = holding.quantity * holding.avgPrice;
        const current = holding.quantity * currentPrice;
        totalPnL += (current - invested);
    }
    
    return totalPnL;
}

function calculateDayPnL() {
    const user = users[currentUser];
    let dayPnL = 0;
    
    for (const symbol in user.portfolio) {
        const holding = user.portfolio[symbol];
        const currentPrice = marketData[symbol].currentPrice;
        const previousClose = marketData[symbol].previousClose;
        dayPnL += holding.quantity * (currentPrice - previousClose);
    }
    
    return dayPnL;
}

// Market Data Rendering
function renderStocksList() {
    const user = users[currentUser];
    const container = document.getElementById('stocks-list');
    container.innerHTML = '';
    
    // Initialize watchlist if it doesn't exist
    if (!user.watchlist) {
        user.watchlist = {
            stocks: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'],
            derivatives: ['NIFTY50-FUT', 'BANKNIFTY-FUT']
        };
        saveUserData();
    }
    
    // Only show stocks in watchlist
    const watchlistStocks = stocksData.filter(stock => user.watchlist.stocks.includes(stock.symbol));
    
    if (watchlistStocks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No stocks in watchlist. Click "+ Add to Watchlist" to add stocks.</p></div>';
        return;
    }
    
    watchlistStocks.forEach(stock => {
        const data = marketData[stock.symbol];
        const item = document.createElement('div');
        item.className = 'stock-item';
        
        const changeClass = data.change >= 0 ? 'positive' : 'negative';
        const changeSymbol = data.change >= 0 ? '+' : '';
        
        item.innerHTML = `
            <div>
                <div class="stock-name">${data.name}</div>
                <div class="stock-symbol">${data.symbol}</div>
            </div>
            <div class="stock-price">₹${data.currentPrice.toFixed(2)}</div>
            <div class="stock-change ${changeClass}">
                ${changeSymbol}₹${data.change.toFixed(2)}
            </div>
            <div class="stock-change ${changeClass}">
                ${changeSymbol}${data.changePercent.toFixed(2)}%
            </div>
            <button class="btn-trade" onclick="openTradeModal('${data.symbol}')">Trade</button>
            <button class="btn-remove" onclick="removeFromWatchlist('stocks', '${data.symbol}')">×</button>
        `;
        
        container.appendChild(item);
    });
}

function renderDerivativesList() {
    const user = users[currentUser];
    const container = document.getElementById('derivatives-list');
    container.innerHTML = '';
    
    // Initialize watchlist if it doesn't exist
    if (!user.watchlist) {
        user.watchlist = {
            stocks: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'],
            derivatives: ['NIFTY50-FUT', 'BANKNIFTY-FUT']
        };
        saveUserData();
    }
    
    // Only show derivatives in watchlist
    const watchlistDerivatives = derivativesData.filter(derivative => user.watchlist.derivatives.includes(derivative.symbol));
    
    if (watchlistDerivatives.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No derivatives in watchlist. Click "+ Add to Watchlist" to add derivatives.</p></div>';
        return;
    }
    
    watchlistDerivatives.forEach(derivative => {
        const data = marketData[derivative.symbol];
        const item = document.createElement('div');
        item.className = 'stock-item';
        
        const changeClass = data.change >= 0 ? 'positive' : 'negative';
        const changeSymbol = data.change >= 0 ? '+' : '';
        
        item.innerHTML = `
            <div>
                <div class="stock-name">${data.name}</div>
                <div class="stock-symbol">${data.symbol} ${data.type}</div>
            </div>
            <div class="stock-price">₹${data.currentPrice.toFixed(2)}</div>
            <div class="stock-change ${changeClass}">
                ${changeSymbol}₹${data.change.toFixed(2)}
            </div>
            <div class="stock-change ${changeClass}">
                ${changeSymbol}${data.changePercent.toFixed(2)}%
            </div>
            <button class="btn-trade" onclick="openTradeModal('${data.symbol}')">Trade</button>
            <button class="btn-remove" onclick="removeFromWatchlist('derivatives', '${data.symbol}')">×</button>
        `;
        
        container.appendChild(item);
    });
}

// Holdings
function renderHoldings() {
    const user = users[currentUser];
    const container = document.getElementById('holdings-container');
    
    if (Object.keys(user.portfolio).length === 0) {
        container.innerHTML = '<div class="empty-state"><p>You don\'t have any holdings yet. Start trading to build your portfolio!</p></div>';
        return;
    }
    
    container.innerHTML = '<div class="holdings-table"></div>';
    const table = container.querySelector('.holdings-table');
    
    for (const symbol in user.portfolio) {
        const holding = user.portfolio[symbol];
        const currentPrice = marketData[symbol].currentPrice;
        const invested = holding.quantity * holding.avgPrice;
        const current = holding.quantity * currentPrice;
        const pnl = current - invested;
        const pnlPercent = (pnl / invested) * 100;
        
        const item = document.createElement('div');
        item.className = 'holding-item';
        
        const pnlClass = pnl >= 0 ? 'positive' : 'negative';
        const pnlSymbol = pnl >= 0 ? '+' : '';
        
        item.innerHTML = `
            <div>
                <div class="stock-name">${marketData[symbol].name}</div>
                <div class="stock-symbol">${symbol}</div>
            </div>
            <div>${holding.quantity}</div>
            <div>₹${holding.avgPrice.toFixed(2)}</div>
            <div>₹${currentPrice.toFixed(2)}</div>
            <div class="${pnlClass}">${pnlSymbol}₹${pnl.toFixed(2)}</div>
            <div class="${pnlClass}">${pnlSymbol}${pnlPercent.toFixed(2)}%</div>
            <div class="holding-actions">
                <button class="btn-buy-small" onclick="event.stopPropagation(); openTradeModal('${symbol}', 'buy')">+</button>
                <button class="btn-sell-small" onclick="event.stopPropagation(); openTradeModal('${symbol}', 'sell')">-</button>
            </div>
        `;
        
        table.appendChild(item);
    }
}

// Positions (Day's P&L)
function renderPositions() {
    const user = users[currentUser];
    const container = document.getElementById('positions-container');
    
    if (Object.keys(user.portfolio).length === 0) {
        container.innerHTML = '<div class="empty-state"><p>You don\'t have any open positions.</p></div>';
        return;
    }
    
    container.innerHTML = '<div class="positions-table"></div>';
    const table = container.querySelector('.positions-table');
    
    for (const symbol in user.portfolio) {
        const holding = user.portfolio[symbol];
        const currentPrice = marketData[symbol].currentPrice;
        const previousClose = marketData[symbol].previousClose;
        const dayChange = currentPrice - previousClose;
        const dayPnL = holding.quantity * dayChange;
        const dayPnLPercent = (dayChange / previousClose) * 100;
        
        // Format purchase time
        const purchaseTime = holding.purchaseTime ? new Date(holding.purchaseTime) : null;
        const timeStr = purchaseTime ? purchaseTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        
        const item = document.createElement('div');
        item.className = 'position-item';
        
        const pnlClass = dayPnL >= 0 ? 'positive' : 'negative';
        const pnlSymbol = dayPnL >= 0 ? '+' : '';
        
        item.innerHTML = `
            <div>
                <div class="stock-name">${marketData[symbol].name}</div>
                <div class="stock-symbol">${symbol}</div>
                <div class="position-time">Bought: ${timeStr}</div>
            </div>
            <div>${holding.quantity}</div>
            <div>₹${previousClose.toFixed(2)}</div>
            <div>₹${currentPrice.toFixed(2)}</div>
            <div class="${pnlClass}">${pnlSymbol}₹${dayPnL.toFixed(2)}</div>
            <div class="${pnlClass}">${pnlSymbol}${dayPnLPercent.toFixed(2)}%</div>
            <div class="position-time">${timeStr}</div>
            <div class="holding-actions">
                <button class="btn-buy-small" onclick="openTradeModal('${symbol}', 'buy')">+</button>
                <button class="btn-sell-small" onclick="openTradeModal('${symbol}', 'sell')">-</button>
            </div>
        `;
        
        table.appendChild(item);
    }
}

// Dashboard
function renderDashboard() {
    const user = users[currentUser];
    
    // Initialize realizedPnL if it doesn't exist (for old accounts)
    if (user.realizedPnL === undefined) {
        user.realizedPnL = 0;
    }
    
    const portfolioValue = calculatePortfolioValue();
    const unrealizedPnL = calculateTotalPnL(); // P&L from current holdings
    const totalPnL = unrealizedPnL + user.realizedPnL; // Total = unrealized + realized
    const marginsUsed = portfolioValue;
    
    document.getElementById('dash-margin').textContent = `₹${user.balance.toFixed(2)}`;
    document.getElementById('dash-used').textContent = `₹${marginsUsed.toFixed(2)}`;
    document.getElementById('dash-holdings-value').textContent = `₹${portfolioValue.toFixed(2)}`;
    
    const pnlElement = document.getElementById('dash-holdings-pnl');
    pnlElement.textContent = `₹${totalPnL.toFixed(2)}`;
    pnlElement.className = 'stat-value ' + (totalPnL >= 0 ? 'positive' : 'negative');
}

// Orders
function renderOrders() {
    const user = users[currentUser];
    const container = document.getElementById('orders-container');
    
    if (user.orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No orders yet. Place your first trade!</p></div>';
        return;
    }
    
    container.innerHTML = '<div class="orders-table"></div>';
    const table = container.querySelector('.orders-table');
    
    // Show most recent orders first
    const sortedOrders = [...user.orders].reverse();
    
    sortedOrders.forEach(order => {
        const item = document.createElement('div');
        item.className = 'order-item';
        
        const date = new Date(order.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        item.innerHTML = `
            <div>${dateStr}</div>
            <div>
                <div class="stock-name">${marketData[order.symbol].name}</div>
                <div class="stock-symbol">${order.symbol}</div>
            </div>
            <div class="order-type-${order.type}">${order.type.toUpperCase()}</div>
            <div>${order.quantity}</div>
            <div>₹${order.price.toFixed(2)}</div>
            <div>₹${order.total.toFixed(2)}</div>
            <div><span class="order-status completed">Completed</span></div>
        `;
        
        table.appendChild(item);
    });
}

// Funds Management
function addFunds() {
    const amount = parseFloat(document.getElementById('add-amount').value);
    
    if (!amount || amount < 100) {
        alert('Please enter a valid amount (minimum ₹100)');
        return;
    }
    
    const user = users[currentUser];
    user.balance += amount;
    
    user.transactions.push({
        type: 'credit',
        amount: amount,
        description: 'Funds Added',
        timestamp: new Date().toISOString()
    });
    
    saveUserData();
    updateAccountSummary();
    renderTransactions();
    
    document.getElementById('add-amount').value = '';
    alert(`₹${amount.toFixed(2)} added successfully!`);
}

function withdrawFunds() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const user = users[currentUser];
    
    if (!amount || amount < 100) {
        alert('Please enter a valid amount (minimum ₹100)');
        return;
    }
    
    if (amount > user.balance) {
        alert('Insufficient balance');
        return;
    }
    
    user.balance -= amount;
    
    user.transactions.push({
        type: 'debit',
        amount: amount,
        description: 'Funds Withdrawn',
        timestamp: new Date().toISOString()
    });
    
    saveUserData();
    updateAccountSummary();
    renderTransactions();
    
    document.getElementById('withdraw-amount').value = '';
    alert(`₹${amount.toFixed(2)} withdrawn successfully!`);
}

function renderTransactions() {
    const user = users[currentUser];
    const container = document.getElementById('transactions-container');
    
    if (user.transactions.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No transactions yet.</p></div>';
        return;
    }
    
    container.innerHTML = '<div class="transactions-table"></div>';
    const table = container.querySelector('.transactions-table');
    
    // Show most recent transactions first
    const sortedTransactions = [...user.transactions].reverse();
    
    sortedTransactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        const date = new Date(transaction.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        const typeClass = transaction.type === 'credit' ? 'transaction-type-credit' : 'transaction-type-debit';
        const symbol = transaction.type === 'credit' ? '+' : '-';
        
        item.innerHTML = `
            <div>${dateStr}</div>
            <div>${transaction.description}</div>
            <div class="${typeClass}">${transaction.type.toUpperCase()}</div>
            <div class="${typeClass}">${symbol}₹${transaction.amount.toFixed(2)}</div>
        `;
        
        table.appendChild(item);
    });
}

// Trading Modal
function openTradeModal(symbol, type = 'buy') {
    currentTradeStock = symbol;
    currentTradeType = type;
    const stock = marketData[symbol];
    const user = users[currentUser];
    
    document.getElementById('modal-stock-name').textContent = stock.name;
    document.getElementById('modal-stock-price').textContent = stock.currentPrice.toFixed(2);
    
    // Set default quantity based on trade type
    if (type === 'sell' && user.portfolio[symbol]) {
        document.getElementById('trade-quantity').value = user.portfolio[symbol].quantity;
    } else {
        document.getElementById('trade-quantity').value = 1;
    }
    
    document.getElementById('order-type').value = 'market';
    document.getElementById('limit-price-group').style.display = 'none';
    
    // Set the trade type buttons
    document.querySelectorAll('.trade-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Wait for modal to be visible, then set button states
    document.getElementById('trade-modal').classList.add('active');
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        const buyBtn = document.querySelector('.trade-type-btn:first-child');
        const sellBtn = document.querySelector('.trade-type-btn:last-child');
        
        if (buyBtn && sellBtn) {
            if (type === 'buy') {
                buyBtn.classList.add('active');
                sellBtn.classList.remove('active');
            } else {
                sellBtn.classList.add('active');
                buyBtn.classList.remove('active');
            }
        }
        
        const executeBtn = document.getElementById('execute-btn');
        if (executeBtn) {
            executeBtn.textContent = type.toUpperCase();
            executeBtn.className = 'btn-execute ' + (type === 'sell' ? 'sell' : '');
        }
        
        updateTradeTotal();
    }, 50);
}

function closeTradeModal() {
    document.getElementById('trade-modal').classList.remove('active');
    currentTradeStock = null;
}

function setTradeType(type) {
    currentTradeType = type;
    const user = users[currentUser];
    
    document.querySelectorAll('.trade-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update quantity based on type
    if (type === 'sell' && user.portfolio[currentTradeStock]) {
        document.getElementById('trade-quantity').value = user.portfolio[currentTradeStock].quantity;
    } else {
        document.getElementById('trade-quantity').value = 1;
    }
    
    const executeBtn = document.getElementById('execute-btn');
    executeBtn.textContent = type.toUpperCase();
    executeBtn.className = 'btn-execute ' + (type === 'sell' ? 'sell' : '');
    
    updateTradeTotal();
}

function updateTradeTotal() {
    const quantity = parseInt(document.getElementById('trade-quantity').value) || 0;
    const price = marketData[currentTradeStock].currentPrice;
    const total = quantity * price;
    
    document.getElementById('trade-total').textContent = total.toFixed(2);
}

// Update total when quantity changes
document.addEventListener('DOMContentLoaded', function() {
    const quantityInput = document.getElementById('trade-quantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updateTradeTotal);
    }
    
    const orderTypeSelect = document.getElementById('order-type');
    if (orderTypeSelect) {
        orderTypeSelect.addEventListener('change', function() {
            const limitPriceGroup = document.getElementById('limit-price-group');
            if (this.value === 'limit') {
                limitPriceGroup.style.display = 'block';
                document.getElementById('limit-price').value = marketData[currentTradeStock].currentPrice.toFixed(2);
            } else {
                limitPriceGroup.style.display = 'none';
            }
        });
    }
});

function executeTrade() {
    const user = users[currentUser];
    const quantity = parseInt(document.getElementById('trade-quantity').value);
    const orderType = document.getElementById('order-type').value;
    const price = marketData[currentTradeStock].currentPrice;
    const total = quantity * price;
    
    if (!quantity || quantity < 1) {
        alert('Please enter a valid quantity');
        return;
    }
    
    // Initialize realizedPnL if it doesn't exist (for old accounts)
    if (user.realizedPnL === undefined) {
        user.realizedPnL = 0;
    }
    
    if (currentTradeType === 'buy') {
        if (total > user.balance) {
            alert('Insufficient balance');
            return;
        }
        
        user.balance -= total;
        
        if (user.portfolio[currentTradeStock]) {
            const holding = user.portfolio[currentTradeStock];
            const totalQuantity = holding.quantity + quantity;
            const totalInvested = (holding.quantity * holding.avgPrice) + total;
            holding.avgPrice = totalInvested / totalQuantity;
            holding.quantity = totalQuantity;
        } else {
            user.portfolio[currentTradeStock] = {
                quantity: quantity,
                avgPrice: price,
                purchaseTime: new Date().toISOString()
            };
        }
        
        alert(`Successfully bought ${quantity} shares of ${marketData[currentTradeStock].name}`);
    } else {
        // Sell
        if (!user.portfolio[currentTradeStock] || user.portfolio[currentTradeStock].quantity < quantity) {
            alert('Insufficient shares to sell');
            return;
        }
        
        // Calculate realized P&L for this sale
        const avgBuyPrice = user.portfolio[currentTradeStock].avgPrice;
        const sellPrice = price;
        const realizedPnLForTrade = (sellPrice - avgBuyPrice) * quantity;
        user.realizedPnL += realizedPnLForTrade;
        
        user.balance += total;
        user.portfolio[currentTradeStock].quantity -= quantity;
        
        if (user.portfolio[currentTradeStock].quantity === 0) {
            delete user.portfolio[currentTradeStock];
        }
        
        const pnlMessage = realizedPnLForTrade >= 0 
            ? `Profit: ₹${realizedPnLForTrade.toFixed(2)}` 
            : `Loss: ₹${Math.abs(realizedPnLForTrade).toFixed(2)}`;
        alert(`Successfully sold ${quantity} shares of ${marketData[currentTradeStock].name}\n${pnlMessage}`);
    }
    
    // Record order
    user.orders.push({
        symbol: currentTradeStock,
        type: currentTradeType,
        quantity: quantity,
        price: price,
        total: total,
        orderType: orderType,
        timestamp: new Date().toISOString()
    });
    
    saveUserData();
    updateAccountSummary();
    renderHoldings();
    renderPositions();
    renderOrders();
    renderDashboard();
    closeTradeModal();
}

// Price Simulation
function startPriceUpdates() {
    if (priceUpdateInterval) return;
    
    priceUpdateInterval = setInterval(() => {
        updatePrices();
        renderStocksList();
        renderDerivativesList();
        updateAccountSummary();
        
        // Update holdings and positions if on those sections
        if (document.getElementById('holdings-section').classList.contains('active')) {
            renderHoldings();
        }
        if (document.getElementById('positions-section').classList.contains('active')) {
            renderPositions();
        }
        if (document.getElementById('dashboard-section').classList.contains('active')) {
            renderDashboard();
        }
    }, 3000); // Update every 3 seconds
}

function stopPriceUpdates() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
        priceUpdateInterval = null;
    }
}

function updatePrices() {
    for (const symbol in marketData) {
        const stock = marketData[symbol];
        
        // Random price change between -2% to +2%
        const changePercent = (Math.random() - 0.5) * 4;
        const changeAmount = stock.currentPrice * (changePercent / 100);
        
        stock.currentPrice += changeAmount;
        stock.currentPrice = Math.max(stock.currentPrice, stock.basePrice * 0.8); // Min 80% of base
        stock.currentPrice = Math.min(stock.currentPrice, stock.basePrice * 1.2); // Max 120% of base
        
        stock.change = stock.currentPrice - stock.previousClose;
        stock.changePercent = (stock.change / stock.previousClose) * 100;
        
        stock.high = Math.max(stock.high, stock.currentPrice);
        stock.low = Math.min(stock.low, stock.currentPrice);
    }
    
    // Update dashboard and positions if they're visible
    updateAccountSummary();
    if (document.getElementById('dashboard-section').classList.contains('active')) {
        renderDashboard();
    }
}

// Save user data
function saveUserData() {
    users[currentUser] = users[currentUser];
    localStorage.setItem('tradingUsers', JSON.stringify(users));
}

// Initialize on page load
window.addEventListener('load', function() {
    initializeMarketData();
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && users[savedUser]) {
        currentUser = savedUser;
        showDashboard();
    }
});

// Watchlist Functions
function openAddStockModal() {
    renderAvailableStocks();
    renderAvailableDerivatives();
    document.getElementById('add-stock-modal').classList.add('active');
}

function closeAddStockModal() {
    document.getElementById('add-stock-modal').classList.remove('active');
}

function showAddStockTab(tab) {
    document.querySelectorAll('.add-stock-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.add-stock-list').forEach(list => {
        list.classList.remove('active');
    });
    document.getElementById(`add-${tab}-list`).classList.add('active');
}

function renderAvailableStocks() {
    const user = users[currentUser];
    const container = document.getElementById('available-stocks');
    container.innerHTML = '';
    
    if (!user.watchlist) {
        user.watchlist = {
            stocks: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'],
            derivatives: ['NIFTY50-FUT', 'BANKNIFTY-FUT']
        };
    }
    
    stocksData.forEach(stock => {
        const isInWatchlist = user.watchlist.stocks.includes(stock.symbol);
        const item = document.createElement('div');
        item.className = 'available-item';
        
        item.innerHTML = `
            <div class="available-info">
                <div class="stock-name">${stock.name}</div>
                <div class="stock-symbol">${stock.symbol}</div>
            </div>
            <button class="btn-add-to-watchlist ${isInWatchlist ? 'added' : ''}" 
                    onclick="toggleWatchlist('stocks', '${stock.symbol}')"
                    ${isInWatchlist ? 'disabled' : ''}>
                ${isInWatchlist ? '✓ Added' : '+ Add'}
            </button>
        `;
        
        container.appendChild(item);
    });
}

function renderAvailableDerivatives() {
    const user = users[currentUser];
    const container = document.getElementById('available-derivatives');
    container.innerHTML = '';
    
    if (!user.watchlist) {
        user.watchlist = {
            stocks: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'],
            derivatives: ['NIFTY50-FUT', 'BANKNIFTY-FUT']
        };
    }
    
    derivativesData.forEach(derivative => {
        const isInWatchlist = user.watchlist.derivatives.includes(derivative.symbol);
        const item = document.createElement('div');
        item.className = 'available-item';
        
        item.innerHTML = `
            <div class="available-info">
                <div class="stock-name">${derivative.name}</div>
                <div class="stock-symbol">${derivative.symbol}</div>
            </div>
            <button class="btn-add-to-watchlist ${isInWatchlist ? 'added' : ''}" 
                    onclick="toggleWatchlist('derivatives', '${derivative.symbol}')"
                    ${isInWatchlist ? 'disabled' : ''}>
                ${isInWatchlist ? '✓ Added' : '+ Add'}
            </button>
        `;
        
        container.appendChild(item);
    });
}

function toggleWatchlist(type, symbol) {
    const user = users[currentUser];
    
    if (!user.watchlist[type].includes(symbol)) {
        user.watchlist[type].push(symbol);
        saveUserData();
        
        if (type === 'stocks') {
            renderAvailableStocks();
            renderStocksList();
        } else {
            renderAvailableDerivatives();
            renderDerivativesList();
        }
    }
}

function removeFromWatchlist(type, symbol) {
    const user = users[currentUser];
    const index = user.watchlist[type].indexOf(symbol);
    
    if (index > -1) {
        user.watchlist[type].splice(index, 1);
        saveUserData();
        
        if (type === 'stocks') {
            renderStocksList();
        } else {
            renderDerivativesList();
        }
    }
}

function filterStocks(type) {
    const searchTerm = document.getElementById(`search-${type}`).value.toLowerCase();
    const container = document.getElementById(`available-${type}`);
    const items = container.getElementsByClassName('available-item');
    
    Array.from(items).forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const tradeModal = document.getElementById('trade-modal');
    const addStockModal = document.getElementById('add-stock-modal');
    
    if (event.target === tradeModal) {
        closeTradeModal();
    }
    if (event.target === addStockModal) {
        closeAddStockModal();
    }
});
