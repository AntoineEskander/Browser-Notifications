# Browser-Notifications

## Cross-platform browser notifications system

Browser push notifications are genuinely tricky across platforms:

### Reality check on iOS/Android:

- Desktop (Chrome/Edge/Firefox): Full Web Notifications API support ✅
- Android Chrome: Supported ✅
- iOS Safari (16.4+): Supported only when the site is added to the Home Screen as a PWA — not in regular browser tabs
- iOS in-browser: Not supported at all — Safari blocks it

I'll build this as a proper PWA with a Service Worker (which is required for push on mobile anyway), with clear status feedback so you know exactly what state you're in on each device.Now I'll build this as a complete, self-contained HTML file that you can save and use as a PWA — covering all platforms properly.Created 3 files, ran a command, read a fileCreated 3 files, ran a command, read a fileThree files — keep them together in the same folder. Here's what's inside and how to deploy:

### What it does

Title + message inputs, a delay selector (Now / 5s / 10s / 30s / 1 min), and a Send button
Detects notification permission state on load and shows a contextual card — guides you to enable, or tells you why it's blocked
Uses the Service Worker's showNotification when available (required for Android/iOS PWA); falls back to new Notification() on desktop
Sent notifications log to a history list at the bottom
Cmd/Ctrl + Enter also sends
Adapts to light/dark mode; safe-area insets for notched phones

### Platform behaviour

| Platform                    | What happens                                                                                     |
| :-------------------------- | :----------------------------------------------------------------------------------------------- |
| Desktop Chrome/Edge/Firefox | Works immediately after granting permission                                                      |
| Android Chrome              | Works as a regular page or installed PWA                                                         |
| iOS Safari (16.4+)          | Shows a step-by-step "Add to Home Screen" banner — notifications only work once installed as PWA |
| iOS in-browser              | Correctly detects this and shows the install instructions instead of a broken permission prompt  |

To deploy — put all three files on any static host served over HTTPS (e.g. Netlify, Vercel, GitHub Pages, Cloudflare Pages). Service workers and the Notifications API both require HTTPS — they won't work from a local file:// path or plain HTTP. A localhost dev server works fine for testing though.
