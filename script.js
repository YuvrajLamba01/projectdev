let expenseChart;

const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let currentCurrency = localStorage.getItem("currentCurrency") || "USD";
let exchangeRates = { USD: 1 };

const API_KEY = "fca_live_xXY27AF48y8OyhtYekpclzz9iAxvZMFC5Q3ktpbH";
const BASE_URL = "https://api.freecurrencyapi.com/v1";


const modal = document.getElementById("transactionModal");
const addTransactionBtn = document.getElementById("addTransactionBtn");
const closeModalBtn = document.querySelector(".close-modal");
const list = document.getElementById("transactionList");
const form = document.getElementById("transactionForm");
const balance = document.getElementById("balance");
const income = document.getElementById("income");
const expense = document.getElementById("expense");
const dateInput = document.getElementById("date");
const currencySelect = document.getElementById("currencySelect");
const shareButton = document.getElementById("shareButton");


dateInput.value = new Date().toISOString().split("T")[0];
currencySelect.value = currentCurrency;


function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Income',
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    data: [],
                    fill: true
                },
                {
                    label: 'Expenses',
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    data: [],
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Income vs Expenses'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


function updateChart() {
    const dates = [...new Set(transactions.map(t => new Date(t.date).toLocaleDateString()))];
    const incomeData = dates.map(date => {
        return transactions
            .filter(t => new Date(t.date).toLocaleDateString() === date && t.type === 'income')
            .reduce((sum, t) => sum + convertAmount(t.amount), 0);
    });
    const expenseData = dates.map(date => {
        return transactions
            .filter(t => new Date(t.date).toLocaleDateString() === date && t.type === 'expense')
            .reduce((sum, t) => sum + convertAmount(t.amount), 0);
    });

    expenseChart.data.labels = dates;
    expenseChart.data.datasets[0].data = incomeData;
    expenseChart.data.datasets[1].data = expenseData;
    expenseChart.update();
}


function openModal() {
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    form.reset();
    dateInput.value = new Date().toISOString().split("T")[0];
}


addTransactionBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});


async function fetchExchangeRates() {
    try {
        const response = await fetch(${BASE_URL}/latest?apikey=${API_KEY}&base_currency=USD);
        if (!response.ok) throw new Error(HTTP error! status: ${response.status});

        const data = await response.json();
        if (data && data.data) {
            exchangeRates = { ...data.data, USD: 1 };
            await updateDisplay();
        }
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
        exchangeRates = {
            USD: 1, EUR: 0.85, GBP: 0.73, JPY: 110.0,
            AUD: 1.35, CAD: 1.25, CHF: 0.92, CNY: 6.45, INR: 74.5
        };
        await updateDisplay();
    }
}

function convertAmount(amount, fromCurrency = "USD", toCurrency = currentCurrency) {
    const rate = exchangeRates[toCurrency] || 1;
    return amount * rate;
}

function getFormatter(currency) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        signDisplay: "always",
    });
}

function formatCurrency(value, currency = currentCurrency) {
    try {
        const convertedValue = convertAmount(value, "USD", currency);
        if (convertedValue === 0) {
            return getFormatter(currency).format(0).replace(/^[+-]/, "");
        }
        return getFormatter(currency).format(convertedValue);
    } catch (error) {
        console.error("Error formatting currency:", error);
        return getFormatter("USD").format(value);
    }
}

function createTransactionElement({ id, name, amount, date, type }) {
    const li = document.createElement("li");
    const sign = type === "income" ? 1 : -1;

    li.innerHTML = `
        <div class="transaction-info">
            <h4>${name}</h4>
            <p>${new Date(date).toLocaleDateString()}</p>
        </div>
        <div class="amount ${type}">
            ${formatCurrency(amount * sign)}
        </div>
    `;

    li.addEventListener("click", () => {
        if (confirm("Delete this transaction?")) {
            deleteTransaction(id);
        }
    });

    return li;
}

async function updateTotal() {
    const incomeTotal = transactions
        .filter((trx) => trx.type === "income")
        .reduce((total, trx) => total + trx.amount, 0);

    const expenseTotal = transactions
        .filter((trx) => trx.type === "expense")
        .reduce((total, trx) => total + trx.amount, 0);

    const balanceTotal = incomeTotal - expenseTotal;

    balance.textContent = formatCurrency(balanceTotal).replace(/^\+/, "");
    income.textContent = formatCurrency(incomeTotal);
    expense.textContent = formatCurrency(expenseTotal * -1);
}

async function updateDisplay() {
    renderList();
    await updateTotal();
    updateChart();
}

function renderList() {
    list.innerHTML = "";
    transactions.forEach((transaction) => {
        const li = createTransactionElement(transaction);
        list.appendChild(li);
    });
}

function deleteTransaction(id) {
    const index = transactions.findIndex((trx) => trx.id === id);
    transactions.splice(index, 1);
    updateDisplay();
    saveTransactions();
}

function addTransaction(e) {
    e.preventDefault();

    const formData = new FormData(form);
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);

    const newTransaction = {
        id: uniqueId,
        name: formData.get("name"),
        amount: parseFloat(formData.get("amount")),
        date: formData.get("date"),
        type: formData.get("type") === "on" ? "expense" : "income",
    };

    if (!newTransaction.name || isNaN(newTransaction.amount) || !newTransaction.date) {
        alert("Please fill in all fields correctly.");
        return;
    }

    transactions.push(newTransaction);
    saveTransactions();
    updateDisplay();
    closeModal();
}

function saveTransactions() {
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem("transactions", JSON.stringify(transactions));
}

async function handleCurrencyChange(e) {
    const newCurrency = e.target.value;
    if (newCurrency === currentCurrency) return;

    currentCurrency = newCurrency;
    localStorage.setItem("currentCurrency", currentCurrency);
    await updateDisplay();
}


shareButton.addEventListener('click', async () => {
    const incomeTotal = transactions
        .filter((trx) => trx.type === "income")
        .reduce((total, trx) => total + trx.amount, 0);

    const expenseTotal = transactions
        .filter((trx) => trx.type === "expense")
        .reduce((total, trx) => total + trx.amount, 0);

    const balanceTotal = incomeTotal - expenseTotal;

    const shareData = {
        title: 'Expense Tracker Summary',
        text: `Current Balance: ${formatCurrency(balanceTotal)}
Income: ${formatCurrency(incomeTotal)}
Expenses: ${formatCurrency(expenseTotal)}
Currency: ${currentCurrency}`
    };

    try {
        if (!navigator.share) {
            const textArea = document.createElement('textarea');
            textArea.value = shareData.text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Summary copied to clipboard!\n\nWeb Share API is not supported in your browser.');
            return;
        }

        await navigator.share(shareData);
    } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = shareData.text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Summary copied to clipboard!');
        console.log('Share failed:', err.message);
    }
});


form.addEventListener("submit", addTransaction);
currencySelect.addEventListener("change", handleCurrencyChange);
initChart();
fetchExchangeRates();
updateDisplay();
