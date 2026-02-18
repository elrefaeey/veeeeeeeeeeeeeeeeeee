const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let lineNum = 0;

for (const line of lines) {
  lineNum++;
  
  // Skip comments
  if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
    continue;
  }
  
  // Find opening tags
  const openMatches = line.matchAll(/<([A-Z][a-zA-Z]*)[^/>]*(?<!\/)\s*>/g);
  for (const match of openMatches) {
    stack.push({ tag: match[1], line: lineNum });
  }
  
  // Find closing tags
  const closeMatches = line.matchAll(/<\/([A-Z][a-zA-Z]*)>/g);
  for (const match of closeMatches) {
    const tag = match[1];
    if (stack.length > 0 && stack[stack.length - 1].tag === tag) {
      stack.pop();
    } else {
      console.log(`❌ Line ${lineNum}: Unexpected closing tag </${tag}>`);
    }
  }
  
  if (lineNum === 1513) {
    console.log(`\n📍 At line 1513, unclosed tags:`);
    stack.forEach(item => {
      console.log(`  - <${item.tag}> opened at line ${item.line}`);
    });
  }
}

console.log(`\n📊 Final unclosed tags:`);
stack.forEach(item => {
  console.log(`  - <${item.tag}> opened at line ${item.line}`);
});
