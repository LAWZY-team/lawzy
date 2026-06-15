const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');
const routes = [
  '/documents', '/editor', '/projects', '/files', 
  '/templates', '/settings', '/sources', '/workspace', '/usage', 
  '/obligations', '/admin', '/fields'
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const route of routes) {
        // Regex to match exact routes inside quotes or backticks, with or without trailing paths
        const regex = new RegExp('([\"\'`])(' + route + ')([/\"\'`])', 'g');
        const originalContent = content;
        content = content.replace(regex, (match, p1, p2, p3) => {
          return p1 + '/clm' + p2 + p3;
        });
        if (content !== originalContent) changed = true;
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      }
    }
  }
}
processDirectory(directoryPath);
