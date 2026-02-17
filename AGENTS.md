# ExecPlans

When writing complex features or significant refactors, create and use an ExecPlan (as described in .agent/PLANS.md) from design to implementation. You can find existing ExecPlans in the `.agent/` folder.

Once an ExecPlan is finished, move it to the `.agent/archive/` directory.

# README files

Whenever there is a README.md file in a directory, be sure to read it and follow any instructions or guidelines it contains.

# Shadcn UI Components

You should use shadcn-svelte UI Components for consistency. When adding or updating components, follow the guidance in `.agent/skills/shadcn-svelte/SKILL.md` for proper installation and usage with pnpm.

# MCP

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
