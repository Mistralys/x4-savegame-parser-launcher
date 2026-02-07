import fs from 'fs';
import path from 'path';

const MANIFEST_DIR = 'Docs/Agents/ProjectManifest';
const OUTPUT_FILE = 'X4-Savegame-Parser-Launcher-Manifest.md';

function mergeManifests() {
  const readmePath = path.join(MANIFEST_DIR, 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found in ProjectManifest directory.');
    return;
  }

  const files = fs.readdirSync(MANIFEST_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
  
  // Sort files to have a consistent order, but put README first
  files.sort();
  const allFiles = ['README.md', ...files];

  let combinedContent = '# X4 Savegame Parser Launcher: Technical Manifest\n\n';
  combinedContent += `> Generated on ${new Date().toISOString()}\n\n`;
  combinedContent += 'This document combines all the technical details from the individual manifest files in the ProjectManifest directory. Each section corresponds to a specific aspect of the project, and you can jump to any section using the links provided.\n\n';

  for (const file of allFiles) {
    const filePath = path.join(MANIFEST_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Add a jump mark target at the top of each section
    const anchor = file.toLowerCase().replace(/[^a-z0-9]/g, '');
    combinedContent += `<a name="${anchor}"></a>\n\n`;
    combinedContent += `--- \n\n# File: ${file}\n\n`;

    // Shift all headers down by one level (h1 -> h2, h2 -> h3, etc.)
    content = content.replace(/^(#+)/gm, '#$1');

    // Replace relative links to other manifest files with jump marks
    // Pattern matches [Text](./filename.md) or [Text](filename.md)
    content = content.replace(/\[([^\]]+)\]\(\.\/([^)]+\.md)\)/g, (match, text, link) => {
      const targetAnchor = link.toLowerCase().replace(/[^a-z0-9]/g, '');
      return `[${text}](#${targetAnchor})`;
    });
    
    content = content.replace(/\[([^\]]+)\]\(([^/][^)]+\.md)\)/g, (match, text, link) => {
        // Skip links that are actually external or absolute (though unlikely here)
        if (link.startsWith('http') || link.startsWith('/')) return match;
        const targetAnchor = link.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `[${text}](#${targetAnchor})`;
    });

    combinedContent += content + '\n\n';
  }

  fs.writeFileSync(OUTPUT_FILE, combinedContent);
  console.log(`Successfully created ${OUTPUT_FILE}`);
}

try {
    mergeManifests();
} catch (err) {
    console.error(err);
}
