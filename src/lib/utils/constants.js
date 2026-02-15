
export const INITIAL_SNIPPETS = [
    { id: 'alim-1', category: 'Alimony', tag: 'Standard', title: 'No Alimony', content: '1. Alimony: Neither party shall be awarded alimony or spousal support, now or in the future. Both parties acknowledge they are self-supporting.' },
    { id: 'cust-1', category: 'Child Custody', tag: 'Standard', title: 'Standard Child List', content: '1. Minor Children: The following children are subject to this decree:\n{#foreach children}  * **{name}**, born on {dob}\n{/foreach}' }
];

export const INITIAL_RAW_TEMPLATE = `# DECREE OF DIVORCE\n\nIn the matter of the marriage of **{petitioner_name}** and **{respondent_name}**, the Court enters the following orders.\n\n[[Alimony Provisions|Alimony|Standard]]\n\n[[Children Provisions|Child Custody|Standard]]\n\nThis decree shall be effective immediately upon signing by the Honorable Judge presiding over this case.`;

export const TIER_TYPES = [
    { id: 'decimal', label: '1, 2, 3 (Arabic)', example: '1.' },
    { id: 'lower-alpha', label: 'a, b, c (Lowercase Letters)', example: 'a.' },
    { id: 'lower-roman', label: 'i, ii, iii (Lowercase Roman)', example: 'i.' },
    { id: 'upper-alpha', label: 'A, B, C (Uppercase Letters)', example: 'A.' },
    { id: 'upper-roman', label: 'I, II, III (Uppercase Roman)', example: 'I.' },
];
