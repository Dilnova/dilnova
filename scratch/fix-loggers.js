const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

function fixLoggersInDir(dir) {
  walkDir(dir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    content = content.replace(/import\s+\{\s*logger\s*\}\s+from\s+['"]@\/shared\/logging\/logger['"];?\n?/g, '');
    content = content.replace(/logger\.(error|warn|info|debug)\(/g, 'console.$1(');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${filePath}`);
    }
  });
}

const dirsToFix = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'features'),
  path.join(__dirname, '..', 'shared')
];

dirsToFix.forEach(dir => {
  if (fs.existsSync(dir)) {
    fixLoggersInDir(dir);
  }
});
