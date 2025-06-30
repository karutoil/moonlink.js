#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DOCS_API_DIR = path.join(__dirname, 'docs/content/api-reference');
const DOCS_ROOT = path.join(__dirname, 'docs/content/4.api');

/**
 * Post-process TypeDoc generated markdown files for Nuxt integration
 */
function postProcessDocs() {
  if (!fs.existsSync(DOCS_API_DIR)) {
    console.log('No generated API docs found. Skipping post-processing.');
    return;
  }

  console.log('Post-processing TypeDoc generated documentation...');
  
  // Process all markdown files in the api-reference directory
  processDirectory(DOCS_API_DIR);
  
  // Copy and organize files for Nuxt
  organizeForNuxt();
  
  console.log('Documentation post-processing completed!');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.md')) {
      processMarkdownFile(filePath);
    }
  });
}

function processMarkdownFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add frontmatter for Nuxt if not present
  if (!content.startsWith('---')) {
    const title = extractTitle(content, path.basename(filePath, '.md'));
    const frontmatter = `---
title: ${title}
description: API documentation for ${title}
---

`;
    content = frontmatter + content;
  }
  
  // Fix internal links to work with Nuxt routing
  content = content.replace(/\]\(([^)]+)\.md\)/g, '](/$1)');
  
  // Add custom styling classes for better integration
  content = content.replace(/^## /gm, '## ');
  content = content.replace(/^### /gm, '### ');
  
  // Wrap code blocks in proper Nuxt syntax highlighting
  content = content.replace(/```typescript/g, '```ts');
  
  fs.writeFileSync(filePath, content);
}

function extractTitle(content, fallback) {
  const match = content.match(/^# (.+)$/m);
  if (match) {
    return match[1];
  }
  
  // Convert filename to title
  return fallback
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function organizeForNuxt() {
  if (!fs.existsSync(DOCS_API_DIR)) return;
  
  // Create symbolic link or copy structure to integrate with Nuxt docs
  const targetDir = path.join(DOCS_ROOT, 'reference');
  
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  
  // Copy the generated docs to the Nuxt content structure
  copyRecursive(DOCS_API_DIR, targetDir);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Run the post-processing
postProcessDocs();
