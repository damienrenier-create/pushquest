const fs = require('fs');
const path = require('path');

function search(dir, keyword) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === '.next') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            search(fullPath, keyword);
        } else {
            const ext = path.extname(file);
            if (['.ts', '.tsx', '.js', '.json', '.md'].includes(ext)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.toLowerCase().includes(keyword.toLowerCase())) {
                        console.log(fullPath);
                    }
                } catch(e) {}
            }
        }
    }
}
search('./', 'nexus');
