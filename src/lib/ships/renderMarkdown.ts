import { marked } from 'marked';

marked.setOptions({
	gfm: true,
	breaks: true
});

export const renderMarkdown = (markdown: string): string => marked.parse(markdown) as string;
