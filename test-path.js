const path = require('path');

const projectPath = 'C:\\Dev\\OmnySystem';
console.log('Input:', projectPath);
console.log('isAbsolute:', path.isAbsolute(projectPath));

const absolutePath = path.isAbsolute(projectPath)
  ? path.normalize(projectPath)
  : path.resolve(projectPath);

console.log('Output:', absolutePath);
console.log('Match:', projectPath === absolutePath);
