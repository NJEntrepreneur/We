// §5: Sandbox rules — plugin code MUST run in <iframe sandbox="allow-scripts">.
// Never add allow-same-origin or allow-storage-access.

export interface SandboxedPlugin {
  readonly iframe: HTMLIFrameElement;
  // Sandboxed iframes (no allow-same-origin) always have an opaque (null) origin.
  // postMessage events from them arrive with event.origin === 'null' (string).
  readonly origin: 'null';
}

export class SandboxLoader {
  static create(bundleUrl: string, container: HTMLElement): SandboxedPlugin {
    const iframe = document.createElement('iframe');

    // §5: allow-scripts only — never allow-same-origin, never allow-storage-access
    iframe.setAttribute('sandbox', 'allow-scripts');

    // §9: stricter CSP for plugin iframes via the csp attribute
    iframe.setAttribute(
      'csp',
      "default-src 'none'; script-src 'self'; connect-src 'none'; object-src 'none';",
    );

    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = bundleUrl;

    container.appendChild(iframe);
    return { iframe, origin: 'null' };
  }

  static destroy(sandboxed: SandboxedPlugin): void {
    sandboxed.iframe.remove();
  }
}
