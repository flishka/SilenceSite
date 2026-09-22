/**
 * Silence External · Smooth Lagging Caret & Text Reveal Controller
 * Provides smooth trailing caret animation (backtrack-like lagging cursor)
 * and smooth character bloom on typing.
 */

export function initSmoothInputs() {
    // Hidden canvas context for accurate text width measurement
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const inputs = document.querySelectorAll('.form-input, input[type="text"], input[type="password"], input[type="email"]');

    inputs.forEach(input => {
        // Skip if already initialized or inside another component
        if (input.dataset.smoothInit) return;
        input.dataset.smoothInit = 'true';

        // Ensure parent has position relative
        let parent = input.parentElement;
        if (!parent.classList.contains('form-group') && !parent.classList.contains('smooth-input-wrap')) {
            const wrap = document.createElement('div');
            wrap.className = 'smooth-input-wrap';
            input.parentNode.insertBefore(wrap, input);
            wrap.appendChild(input);
            parent = wrap;
        } else {
            parent.style.position = 'relative';
        }

        // Create the smooth lagging caret
        const caret = document.createElement('div');
        caret.className = 'smooth-caret';
        parent.appendChild(caret);

        // Function to calculate exact caret X position
        function updateCaretPosition() {
            const computed = window.getComputedStyle(input);
            const font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
            ctx.font = font;

            const val = input.value || '';
            const selStart = input.selectionStart || 0;
            const subStr = val.substring(0, selStart);

            // If password, measure bullet characters
            const textToMeasure = input.type === 'password' ? '•'.repeat(subStr.length) : subStr;
            const textWidth = ctx.measureText(textToMeasure).width;

            const paddingLeft = parseFloat(computed.paddingLeft) || 16;
            const scrollLeft = input.scrollLeft || 0;
            const posX = paddingLeft + textWidth - scrollLeft;

            caret.style.transform = `translate(${posX}px, -50%)`;
        }

        let blinkTimer = null;
        function resetBlink() {
            caret.classList.remove('blinking');
            caret.classList.add('active');
            clearTimeout(blinkTimer);
            blinkTimer = setTimeout(() => {
                if (document.activeElement === input) {
                    caret.classList.add('blinking');
                }
            }, 300);
        }

        input.addEventListener('focus', () => {
            updateCaretPosition();
            caret.classList.add('active');
            resetBlink();
        });

        input.addEventListener('blur', () => {
            caret.classList.remove('active');
            caret.classList.remove('blinking');
            clearTimeout(blinkTimer);
        });

        input.addEventListener('input', () => {
            updateCaretPosition();
            resetBlink();

            // Trigger smooth bloom
            input.classList.remove('typing-bloom');
            void input.offsetWidth; // reflow
            input.classList.add('typing-bloom');
        });

        input.addEventListener('keydown', () => {
            resetBlink();
            requestAnimationFrame(updateCaretPosition);
        });

        input.addEventListener('keyup', () => {
            updateCaretPosition();
        });

        input.addEventListener('click', () => {
            updateCaretPosition();
            resetBlink();
        });

        input.addEventListener('scroll', () => {
            updateCaretPosition();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initSmoothInputs();
});
