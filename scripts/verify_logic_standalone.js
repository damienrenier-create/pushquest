
function getDayOfYear(dateISO) {
    const d = new Date(dateISO);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function getFineAmountForMonth(dateISO) {
    const month = new Date(dateISO).getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar...
    const amounts = {
        2: 2,  // March
        3: 3,  // April
        4: 4,  // May
        5: 5,  // June
        6: 6,  // July
        7: 7,  // August
        8: 8,  // September
        9: 9,  // October
        10: 10, // November
        11: 10, // December
    };
    return amounts[month] || 0;
}

function test() {
    console.log("--- Testing dayOfYear ---");
    const tests = [
        { date: "2026-01-01", expected: 1 },
        { date: "2026-02-28", expected: 59 },
        { date: "2026-03-01", expected: 60 },
        { date: "2026-12-31", expected: 365 },
        { date: "2024-03-01", expected: 61 }, // Leap year 2024
    ];

    tests.forEach(t => {
        const val = getDayOfYear(t.date);
        console.log(`[${t.date}] got: ${val}, expected: ${t.expected} -> ${val === t.expected ? "PASS" : "FAIL"}`);
    });

    console.log("\n--- Testing fineAmounts ---");
    const fineTests = [
        { date: "2026-03-15", expected: 2 },
        { date: "2026-04-15", expected: 3 },
        { date: "2026-11-15", expected: 10 },
        { date: "2026-12-15", expected: 10 },
        { date: "2026-01-15", expected: 0 },
        { date: "2026-02-15", expected: 0 },
    ];

    fineTests.forEach(t => {
        const val = getFineAmountForMonth(t.date);
        console.log(`[${t.date}] got: ${val}€, expected: ${t.expected}€ -> ${val === t.expected ? "PASS" : "FAIL"}`);
    });
}

test();
