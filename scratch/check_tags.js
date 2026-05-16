const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\aksha\\Desktop\\website\\freelancing-website\\src\\pages\\Manager.jsx', 'utf8');

let divCount = 0;
let mainCount = 0;
let braceCount = 0;
let parenCount = 0;

const lines = content.split('\n');
lines.forEach((line, i) => {
    const divs = (line.match(/<div/g) || []).length;
    const endDivs = (line.match(/<\/div>/g) || []).length;
    divCount += divs - endDivs;
    
    const mains = (line.match(/<main/g) || []).length;
    const endMains = (line.match(/<\/main>/g) || []).length;
    mainCount += mains - endMains;

    if (divCount < 0) console.log(`Extra </div> at line ${i+1}`);
    if (mainCount < 0) console.log(`Extra </main> at line ${i+1}`);
});

console.log(`Final divCount: ${divCount}`);
console.log(`Final mainCount: ${mainCount}`);
