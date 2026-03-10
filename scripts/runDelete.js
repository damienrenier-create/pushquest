const { spawn } = require('child_process');
const server = spawn('cmd', ['/c', 'npm', 'run', 'dev'], { stdio: 'ignore' });
console.log("Starting Next.js Dev Server to delete 'modo'...");
setTimeout(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/dev');
        console.log("Delete response:", await res.json());
    } catch (e) {
        console.error("Fetch failed", e);
    }
    server.kill();
    process.exit(0);
}, 12000);
