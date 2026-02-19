import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Converts a subset of Markdown to sanitised HTML for rendering AI chat responses.
 *
 * Supported syntax:
 *  - **bold** / *italic*
 *  - Numbered lists  (1. item)
 *  - Bullet lists    (- item  or  • item)
 *  - Blank-line paragraph breaks
 *  - Single-line breaks
 *
 * All incoming text is HTML-entity-escaped before transformation, so the only
 * HTML tags that appear in the output are ones this pipe explicitly inserts —
 * preventing any injection from the AI response payload.
 */
@Pipe({ name: 'markdown', standalone: true, pure: true })
export class MarkdownPipe implements PipeTransform {
    private readonly sanitizer = inject(DomSanitizer);

    transform(value: string | null | undefined): SafeHtml {
        if (!value) return '';
        return this.sanitizer.bypassSecurityTrustHtml(this.toHtml(value));
    }

    private toHtml(text: string): string {
        return (
            text
                // 1. Escape HTML entities (XSS prevention — must happen first)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')

                // 2. Bold: **text**
                .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')

                // 3. Italic: *text*  (not preceded/followed by another *)
                .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em class="italic">$1</em>')

                // 4. Numbered list items:  1. text
                .replace(
                    /^(\d+)\. (.+)$/gm,
                    '<div class="flex gap-2 items-start leading-snug my-0.5">' +
                    '<span class="font-medium shrink-0 min-w-[1rem] text-right">$1.</span>' +
                    '<span>$2</span>' +
                    '</div>',
                )

                // 5. Bullet list items:  - text  or  • text
                .replace(
                    /^[•\-\*] (.+)$/gm,
                    '<div class="flex gap-2 items-start leading-snug my-0.5">' +
                    '<span class="shrink-0 opacity-70 mt-0.5 text-xs">•</span>' +
                    '<span>$1</span>' +
                    '</div>',
                )

                // 6. Paragraph breaks (two or more newlines → spacer)
                .replace(/\n{2,}/g, '<div class="my-2"></div>')

                // 7. Remaining single newlines → <br>
                .replace(/\n/g, '<br>')
        );
    }
}
