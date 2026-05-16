const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\aksha\\Desktop\\website\\freelancing-website\\src\\pages\\Manager.jsx', 'utf8');

const stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tags = line.match(/<[a-zA-Z]+|<\/[a-zA-Z]+>/g) || [];
    for (const tag of tags) {
        if (tag.startsWith('</')) {
            const closing = tag.slice(2, -1);
            if (stack.length === 0) {
                console.log(`Extra closing tag </${closing}> at line ${i + 1}`);
            } else {
                const opening = stack.pop();
                if (opening !== closing) {
                    console.log(`Mismatch: opened <${opening}>, closed </${closing}> at line ${i + 1}`);
                }
            }
        } else {
            const opening = tag.slice(1);
            stack.push(opening);
        }
    }
}

if (stack.length > 0) {
    console.log(`Unclosed tags: ${stack.join(', ')}`);
} else {
    console.log('All tags are balanced!');
}
