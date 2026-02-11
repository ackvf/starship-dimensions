import fs from "node:fs/promises"
import path from "node:path"

/**
 * This script converts the ship dataset CSV output generated with [.agent/archive/ship-dataset-prompt.md](.agent/archive/ship-dataset-prompt.md)
 * into individual Markdown files with YAML frontmatter.
 */

type CliArgs = {
	input?: string
	out?: string
}

type ShipLink = {
	label: string
	url: string
}

type FrontmatterData = {
	name: string
	universe: string
	lengthMeters: number
	tags: string[]
	images: {
		main: string
		gallery: string[]
	}
	links: ShipLink[]
}

const DEFAULT_INPUT = "static/ship-dataset-output.csv"
const DEFAULT_OUT_DIR = "src/lib/ships/data"

const args = parseArgs(process.argv.slice(2))
const inputPath = args.input ?? DEFAULT_INPUT
const outDir = args.out ?? DEFAULT_OUT_DIR

const csvText = await fs.readFile(inputPath, "utf8")
const rows = parseCsv(csvText)

if (rows.length === 0) {
	throw new Error(`No rows found in ${inputPath}`)
}

const headers = rows[0]
const records = rows.slice(1)

await fs.mkdir(outDir, { recursive: true })

const usedNames = new Map<string, number>()

for (const record of records) {
	const data = rowToObject(headers, record)
	const name = data.name?.trim()
	const universe = data.universe?.trim()
	const lengthMeters = parseNumber(data.lengthMeters)
	const tags = parseStringArray(data.tags)
	const mainImage = data["images.main"]?.trim()
	const gallery = parseStringArray(data["images.gallery"])
	const links = parseLinks(data.links)
	const description = (data.description ?? "").trim()

	if (!name || !universe || !Number.isFinite(lengthMeters) || !mainImage) {
		continue
	}

	const slugBase = slugify(`${name}-${universe}`) || "ship"
	const slug = dedupeSlug(slugBase, usedNames)
	const filename = `${slug}.md`
	const filePath = path.join(outDir, filename)

	const frontmatter = buildFrontmatter({
		name,
		universe,
		lengthMeters,
		tags,
		images: {
			main: mainImage,
			gallery
		},
		links
	})

	const body = description ? `${description}
` : ""
	const content = `${frontmatter}

${body}`

	await fs.writeFile(filePath, content, "utf8")
}

function parseArgs(argv: string[]): CliArgs {
	const result: CliArgs = {}
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i]
		if (arg === "--input") {
			result.input = argv[i + 1]
			i += 1
			continue
		}
		if (arg === "--out") {
			result.out = argv[i + 1]
			i += 1
		}
	}
	return result
}

function parseCsv(text: string): string[][] {
	const rows: string[][] = []
	let row: string[] = []
	let field = ""
	let inQuotes = false

	for (let i = 0; i < text.length; i += 1) {
		const char = text[i]
		const next = text[i + 1]

		if (char === '"') {
			if (inQuotes && next === '"') {
				field += '"'
				i += 1
				continue
			}
			inQuotes = !inQuotes
			continue
		}

		if (!inQuotes && (char === "," || char === "\n" || char === "\r")) {
			row.push(field)
			field = ""

			if (char === "\r" && next === "\n") {
				i += 1
			}

			if (char !== ",") {
				rows.push(row)
				row = []
			}
			continue
		}

		field += char
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field)
		rows.push(row)
	}

	return rows
}

function rowToObject(headers: string[], values: string[]): Record<string, string> {
	const obj: Record<string, string> = {}
	for (let i = 0; i < headers.length; i += 1) {
		obj[headers[i]] = values[i] ?? ""
	}
	return obj
}

function parseJsonArray(value?: string): unknown[] {
	const trimmed = (value ?? "").trim()
	if (!trimmed) {
		return []
	}
	try {
		const parsed = JSON.parse(trimmed)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

function parseStringArray(value?: string): string[] {
	const items = parseJsonArray(value)
	return items
		.map(item => String(item).trim())
		.filter(item => item.length > 0)
}

function parseLinks(value?: string): ShipLink[] {
	const items = parseJsonArray(value)
	const links: ShipLink[] = []
	for (const item of items) {
		if (!item || typeof item !== "object") {
			continue
		}
		const link = item as Record<string, unknown>
		const label = typeof link.label === "string" ? link.label.trim() : ""
		const url = typeof link.url === "string" ? link.url.trim() : ""
		if (!label || !url) {
			continue
		}
		links.push({ label, url })
	}
	return links
}

function parseNumber(value?: string): number {
	const numberValue = Number(value)
	return Number.isFinite(numberValue) ? numberValue : Number.NaN
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

function dedupeSlug(slug: string, used: Map<string, number>): string {
	const current = used.get(slug) ?? 0
	used.set(slug, current + 1)
	if (current === 0) {
		return slug
	}
	return `${slug}-${current + 1}`
}

function buildFrontmatter(data: FrontmatterData): string {
	const lines: string[] = ["---"]
	lines.push(`name: ${yamlQuote(data.name)}`)
	lines.push(`universe: ${yamlQuote(data.universe)}`)
	lines.push(`lengthMeters: ${data.lengthMeters}`)

	if (data.tags.length > 0) {
		lines.push("tags:")
		for (const tag of data.tags) {
			lines.push(`  - ${yamlQuote(tag)}`)
		}
	}

	lines.push("images:")
	lines.push(`  main: ${yamlQuote(data.images.main)}`)

	if (data.images.gallery.length > 0) {
		lines.push("  gallery:")
		for (const item of data.images.gallery) {
			lines.push(`    - ${yamlQuote(item)}`)
		}
	}

	if (data.links.length > 0) {
		lines.push("links:")
		for (const link of data.links) {
			lines.push(`  - label: ${yamlQuote(link.label)}`)
			lines.push(`    url: ${yamlQuote(link.url)}`)
		}
	}

	lines.push("---")
	return lines.join("\n")
}

function yamlQuote(value: string): string {
	const escaped = String(value)
		.replace(/\\/g, "\\\\")
		.replace(/"/g, "\\\"")
		.replace(/\n/g, "\\n")
	return `"${escaped}"`
}
