const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

let braces = 0;
let parens = 0;
let brackets = 0;

for (let i = 0; i < Math.min(1513, lines.length); i++) {
  const line = lines[i];
  
  // Skip comments
  if (line.trim().startsWith('//')) continue;
  
  for (const char of line) {
    if (char === '{') braces++;
    else if (char === '}') braces--;
    else if (char === '(') parens++;
    else if (char === ')') parens--;
    else if (char === '[') brackets++;
    else if (char === ']') brackets--;
  }
  
  // Log problematic lines
  if (i >= 1505 && i <= 1515) {
    console.log(`Line ${i+1}: braces=${braces}, parens=${parens}, brackets=${brackets}`);
    console.log(`  ${line.substring(0, 80)}`);
  }
}

console.log(`\nAt line 1513:`);
console.log(`  Open braces: ${braces}`);
console.log(`  Open parens: ${parens}`);
console.log(`  Open brackets: ${brackets}`);
