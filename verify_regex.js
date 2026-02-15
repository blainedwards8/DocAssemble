import { extractStructureMetadata } from './src/utils.js';

const testMarkdown = `
# Test Document
Variable 1: {var1}
Variable 2 (Date): {var2|date}
Variable 3 (Select): {var3[Red, Green, Blue]}
Loop:
{#foreach items}
  Child Var: {child_var|date}
{/foreach}
`;

const metadata = extractStructureMetadata(testMarkdown);
console.log("METADATA_START");
console.log(JSON.stringify(metadata, null, 2));
console.log("METADATA_END");
