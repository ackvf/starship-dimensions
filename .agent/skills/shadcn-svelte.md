# shadcn-svelte UI Component Installation Skill

## Purpose
This skill enables agents to reliably find, install, and use shadcn-svelte UI components in SvelteKit projects using pnpm. It encodes the repeatable process for searching the shadcn-svelte documentation, running the correct install commands, and handling any post-install steps or peer dependencies.

## When to Use
- When a UI component is needed for a SvelteKit project and the ExecPlan or repo standard requires shadcn-svelte.
- When adding, updating, or troubleshooting shadcn-svelte components.

## How to Use
1. **Find the Component**
   - Visit https://www.shadcn-svelte.com/docs/components
   - Use the search or browse the list to find the desired component (e.g., Button, Dialog, Card).
   - Click the component to view its documentation and installation instructions.

2. **Install the Component with pnpm**
   - In the component's documentation, locate the "Installation" section.
   - Choose CLI installation, not the manual file copy method.
   - Copy the provided pnpm command (e.g., `pnpm dlx shadcn-svelte@latest add button`).
   - Run the command in the root of the SvelteKit project.
   - Follow any interactive prompts or instructions during installation, such as adjusting project settings, selecting a version, or confirming peer dependencies.

3. **Post-Install Steps**
   - Follow any additional steps listed in the component docs (e.g., import styles, update svelte.config.js, add theme files).
   - If you overwrote files, review any local customizations that may have been replaced.

4. **Usage**
   - The CLI will install the component at `src/lib/components/ui/[component]`.
   - Import and use the component in your Svelte files as shown in the documentation.
   - Refer to the usage examples for props, slots, and customization.

## Example: Installing the Button Component
1. Go to https://www.shadcn-svelte.com/docs/components/button
2. Find the Installation section. Example command:

   pnpm dlx shadcn-svelte@latest add button

3. Run the command in the SvelteKit project root. You may see prompts like:

   ◆  Ready to install components and dependencies?
   ● Yes / ○ No

   Select "Yes" to continue.

4. If the component already exists, you may see:

   ▲  The following items already exist:
   │  button
   ◆  Would you like to overwrite all existing files?
   ○ Yes, overwrite everything / ● No, let me decide individually

   Choose "Yes, overwrite everything" to update the component.

5. Wait for the CLI to finish. You should see:

   Success! Components added.

6. Follow any post-install steps (e.g., import styles in +layout.svelte).
7. Use the component as shown in the docs.

## Troubleshooting
- If a component does not work as expected, check for missing peer dependencies, incomplete post-install steps, or overwritten local changes.
- If you see prompts about overwriting files, be aware that local modifications will be replaced.
- Always refer to the latest docs for updates and CLI changes.

## Notes
- Always use pnpm for consistency with project standards.
- The CLI is interactive; be prepared to answer prompts for installation and overwriting files.
- If a new version of shadcn-svelte is released, check for breaking changes before upgrading.

Skill last updated: 2026-02-10 (improved with real CLI prompt and overwrite experience)
