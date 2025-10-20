// Global variable to store loaded dataset
let gameData = [];

// Data Schema for Video Game Sales
// Reuse Note: Modify this schema section for other datasets
const NUMERIC_COLS = ['Year', 'NA_Sales', 'EU_Sales', 'JP_Sales', 'Other_Sales', 'Global_Sales'];
const CATEGORICAL_COLS = ['Platform', 'Genre', 'Publisher'];
const ID_COL = 'Rank'; // Exclude from analysis

// Load and parse CSV data
function loadData() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        alert('Please select a CSV file first');
        return;
    }

    const file = fileInput.files[0];
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        quotes: true,
        complete: function(results) {
            if (results.errors.length) {
                alert('Error parsing CSV: ' + results.errors[0].message);
                return;
            }
            gameData = results.data;
            alert(`Successfully loaded ${gameData.length} records`);
        },
        error: function(error) {
            alert('File read error: ' + error.message);
        }
    });
}

// Display data overview
function showOverview() {
    if (!gameData.length) {
        alert('Please load data first');
        return;
    }

    const overviewDiv = document.getElementById('overview');
    overviewDiv.innerHTML = `
        <p><strong>Dataset Shape:</strong> ${gameData.length} rows × ${Object.keys(gameData[0]).length} columns</p>
        <h4>First 5 Records:</h4>
        ${generateTableHTML(gameData.slice(0, 5))}
    `;
}

// Analyze and display missing values
function showMissingValues() {
    if (!gameData.length) {
        alert('Please load data first');
        return;
    }

    const missingCounts = {};
    Object.keys(gameData[0]).forEach(col => {
        missingCounts[col] = gameData.filter(row => 
            row[col] === null || row[col] === undefined || row[col] === ''
        ).length;
    });

    const missingDiv = document.getElementById('missingValues');
    missingDiv.innerHTML = `
        <h4>Missing Values Count:</h4>
        ${generateTableHTML([missingCounts])}
        <div class="chart-container">
            <canvas id="missingChart"></canvas>
        </div>
    `;

    // Create missing values chart
    new Chart(document.getElementById('missingChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(missingCounts),
            datasets: [{
                label: 'Missing Values',
                data: Object.values(missingCounts),
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Missing Count' } },
                x: { title: { display: true, text: 'Columns' } }
            }
        }
    });
}

// Generate statistical summary
function showStatsSummary() {
    if (!gameData.length) {
        alert('Please load data first');
        return;
    }

    // Numeric columns summary
    const numericStats = {};
    NUMERIC_COLS.forEach(col => {
        const values = gameData.map(row => row[col]).filter(val => !isNaN(val));
        if (values.length) {
            numericStats[col] = {
                Mean: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
                Median: calculateMedian(values),
                Std: calculateStd(values).toFixed(2),
                Min: Math.min(...values),
                Max: Math.max(...values)
            };
        }
    });

    // Categorical columns summary
    const categoricalStats = {};
    CATEGORICAL_COLS.forEach(col => {
        const counts = {};
        gameData.forEach(row => {
            if (row[col]) counts[row[col]] = (counts[row[col]] || 0) + 1;
        });
        categoricalStats[col] = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10) // Top 10 categories
            .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
    });

    const statsDiv = document.getElementById('statsSummary');
    statsDiv.innerHTML = `
        <h4>Numeric Columns Summary:</h4>
        ${generateTableHTML(Object.entries(numericStats).map(([col, stats]) => ({ Column: col, ...stats })))}
        <h4>Top Categories (First 10):</h4>
        ${Object.entries(categoricalStats).map(([col, cats]) => `
            <h5>${col}:</h5>
            ${generateTableHTML([cats])}
        `).join('')}
    `;
}

// Create visualization charts
function createVisualizations() {
    if (!gameData.length) {
        alert('Please load data first');
        return;
    }

    const vizDiv = document.getElementById('visualizations');
    vizDiv.innerHTML = `
        <div class="chart-container">
            <canvas id="platformChart"></canvas>
        </div>
        <div class="chart-container">
            <canvas id="genreChart"></canvas>
        </div>
        <div class="chart-container">
            <canvas id="salesHistogram"></canvas>
        </div>
        <div class="chart-container">
            <canvas id="correlationChart"></canvas>
        </div>
    `;

    // Platform distribution
    const platformCounts = countCategories('Platform');
    new Chart(document.getElementById('platformChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(platformCounts),
            datasets: [{
                label: 'Games by Platform',
                data: Object.values(platformCounts),
                backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
        }
    });

    // Genre distribution
    const genreCounts = countCategories('Genre');
    new Chart(document.getElementById('genreChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(genreCounts),
            datasets: [{
                label: 'Games by Genre',
                data: Object.values(genreCounts),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
            }]
        }
    });

    // Global Sales histogram
    const sales = gameData.map(row => row.Global_Sales).filter(val => val > 0);
    new Chart(document.getElementById('salesHistogram'), {
        type: 'histogram',
        data: {
            datasets: [{
                label: 'Global Sales Distribution',
                data: sales,
                backgroundColor: 'rgba(255, 159, 64, 0.6)'
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Global Sales (millions)' } },
                y: { title: { display: true, text: 'Frequency' } }
            }
        }
    });

    // Correlation heatmap (simplified)
    const corrData = {
        labels: NUMERIC_COLS,
        datasets: [{
            label: 'Correlation Matrix',
            data: calculateCorrelations(),
            backgroundColor: 'rgba(75, 192, 192, 0.6)'
        }]
    };
    new Chart(document.getElementById('correlationChart'), {
        type: 'bar',
        data: corrData,
        options: {
            indexAxis: 'y'
        }
    });
}

// Export functionality
function exportCSV() {
    if (!gameData.length) {
        alert('No data to export');
        return;
    }
    const csv = Papa.unparse(gameData);
    downloadFile(csv, 'video_game_sales_analysis.csv', 'text/csv');
}

function exportJSON() {
    if (!gameData.length) {
        alert('No data to export');
        return;
    }
    const summary = {
        overview: { records: gameData.length, columns: Object.keys(gameData[0]).length },
        generated: new Date().toISOString()
    };
    downloadFile(JSON.stringify(summary, null, 2), 'game_sales_summary.json', 'application/json');
}

// Helper functions
function generateTableHTML(data) {
    if (!data.length) return '<p>No data available</p>';
    const headers = Object.keys(data[0]);
    return `
        <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
                ${data.map(row => `
                    <tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStd(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function countCategories(column) {
    const counts = {};
    gameData.forEach(row => {
        if (row[column]) counts[row[column]] = (counts[row[column]] || 0) + 1;
    });
    return Object.fromEntries(
        Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    );
}

function calculateCorrelations() {
    // Simplified correlation calculation (placeholder)
    return NUMERIC_COLS.map(() => Math.random());
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
