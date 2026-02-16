
const regex = /\{([a-zA-Z0-9_-]+)(?:\|([a-zA-Z0-9_-]+))?(?:\[(.*?)\])?\}/g;

const testCases = [
    "{child-gender[Boy, Girl]}",
    "{child-gender[Boy,Girl]}",
    "{marriage-date|date}",
    "{simple-var}",
    "{spaced-options[Option One, Option Two]}"
];

testCases.forEach(input => {
    console.log(`Testing: "${input}"`);
    // Reset regex lastIndex because of 'g' flag
    regex.lastIndex = 0;
    const match = regex.exec(input);

    if (match) {
        console.log("  Match found!");
        console.log(`  Name (Group 1): "${match[1]}"`);
        console.log(`  Type (Group 2): "${match[2]}"`);
        console.log(`  Opts (Group 3): "${match[3]}"`);

        // Simulating the logic in utils.js
        const name = match[1];
        const type = match[2];
        const optionsStr = match[3];

        let meta = {};
        if (type || optionsStr) {
            meta = {
                type: type || (optionsStr ? 'select' : 'text'),
                options: optionsStr ? optionsStr.split(',').map(o => o.trim()) : undefined
            };
        }
        console.log("  Inferred Config:", JSON.stringify(meta));

    } else {
        console.log("  NO MATCH!");
    }
    console.log("-".repeat(20));
});
