const BROKER_PATTERNS: { patterns: RegExp[]; name: string }[] = [
	{ patterns: [/^0104\d{8}$/], name: "中航证券" },
	{ patterns: [/^169\d{5}$/], name: "中金" },
	{ patterns: [/^061\d{5}$/], name: "光大证券" },
	{
		patterns: [/^718\d{5}$/, /^60718\d{7}$/, /^60203\d{7}$/],
		name: "东方证券",
	},
	{ patterns: [/^48200\d{5}$/, /^7665\d{4}$/], name: "海通证券" },
	{ patterns: [/^0236\d{8}$/], name: "东吴证券" },
	{ patterns: [/^DB\d*$/], name: "东北证券" },
]

export function getBrokerNameByAccountId(accountId: string): string {
	if (!accountId || typeof accountId !== "string") return ""
	const trimmed = accountId.trim()
	for (const { patterns, name } of BROKER_PATTERNS) {
		if (patterns.some((re) => re.test(trimmed))) return name
	}
	return ""
}
