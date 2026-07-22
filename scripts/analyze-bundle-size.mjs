import fs from 'fs';
import path from 'path';

function getDirectorySize(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  }
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusBadge(sizeInBytes) {
  const kb = sizeInBytes / 1024;
  if (kb < 200) return '🟢 Pass (<200kB)';
  if (kb < 350) return '🟡 Moderate (<350kB)';
  return '🔴 Heavy (>350kB)';
}

async function analyzeBundle() {
  const nextDir = path.join(process.cwd(), '.next');
  const staticDir = path.join(nextDir, 'static');

  if (!fs.existsSync(nextDir)) {
    console.error('Error: .next directory does not exist. Run build first.');
    process.exit(1);
  }

  const totalStaticSize = getDirectorySize(staticDir);

  const manifestPath = path.join(nextDir, 'build-manifest.json');
  const appManifestPath = path.join(nextDir, 'app-build-manifest.json');
  const appPathsManifestPath = path.join(nextDir, 'server', 'app-paths-manifest.json');

  const routesMap = new Map();

  // App router routes
  if (fs.existsSync(appPathsManifestPath)) {
    const appPaths = JSON.parse(fs.readFileSync(appPathsManifestPath, 'utf8'));
    for (const [route, filePath] of Object.entries(appPaths)) {
      const fullPath = path.join(nextDir, 'server', filePath);
      if (fs.existsSync(fullPath)) {
        const size = fs.statSync(fullPath).size;
        routesMap.set(route, size);
      }
    }
  }

  // App build manifest files
  if (fs.existsSync(appManifestPath)) {
    const appManifest = JSON.parse(fs.readFileSync(appManifestPath, 'utf8'));
    const pages = appManifest.pages || {};
    for (const [route, files] of Object.entries(pages)) {
      let routeSize = routesMap.get(route) || 0;
      for (const file of files) {
        const fullPath = path.join(nextDir, file);
        if (fs.existsSync(fullPath)) {
          routeSize += fs.statSync(fullPath).size;
        }
      }
      routesMap.set(route, routeSize);
    }
  }

  // Fallback for pages manifest
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const pages = manifest.pages || {};
    for (const [route, files] of Object.entries(pages)) {
      let routeSize = routesMap.get(route) || 0;
      for (const file of files) {
        const fullPath = path.join(nextDir, file);
        if (fs.existsSync(fullPath)) {
          routeSize += fs.statSync(fullPath).size;
        }
      }
      routesMap.set(route, routeSize);
    }
  }

  const routes = Array.from(routesMap.entries())
    .map(([route, size]) => ({ route, size }))
    .sort((a, b) => b.size - a.size);

  let markdown = `## 📦 Bundle Size Analysis Report\n\n`;
  markdown += `**Total Client Static Assets Size:** \`${formatBytes(totalStaticSize)}\`\n\n`;

  if (routes.length > 0) {
    markdown += `| Route / Page | JS Payload Size | Status |\n`;
    markdown += `| :--- | :--- | :--- |\n`;
    for (const { route, size } of routes.slice(0, 25)) {
      markdown += `| \`${route}\` | ${formatBytes(size)} | ${getStatusBadge(size)} |\n`;
    }
  } else {
    markdown += `*Note: Build stats will be populated automatically during CI production build step.*\n`;
  }

  console.log('\n--- Bundle Size Analysis Summary ---');
  console.log(`Total Static JS/CSS Assets: ${formatBytes(totalStaticSize)}`);
  console.log(`Analyzed Routes Count: ${routes.length}`);
  console.log('------------------------------------\n');

  const githubSummaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (githubSummaryPath) {
    fs.appendFileSync(githubSummaryPath, markdown);
    console.log('Successfully wrote bundle analysis report to GitHub Step Summary!');
  } else {
    console.log(markdown);
  }
}

analyzeBundle().catch(err => {
  console.error('Failed to analyze bundle size:', err);
  process.exit(1);
});
