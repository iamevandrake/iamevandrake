# How this site is built and deployed

Personal site for Evan Drake. Plain HTML, CSS and JavaScript with no build step and no dependencies.

- `index.html` holds all the copy. Edit text there.
- `styles.css` holds the look: paper, ink, type, and both layouts.
- `main.js` draws the landscape, moves the sun, and turns scrolling into walking forward.

On larger screens the sections stand one behind another in 3D space and scrolling moves you through them, while the sun crosses the sky and the hills drift past. On phones, with reduced-motion turned on, or without JavaScript, the same content is a normal scrolling page over the same landscape.

## Preview locally

    python3 -m http.server 8000

Then open http://localhost:8000.

## Deploy on GitHub Pages

1. Push this folder to the public GitHub repository `iamevandrake/iamevandrake`.
2. In the repository: Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Under "Custom domain" enter `iamevandrake.com` and save. The `CNAME` file in this folder already says the same thing.

## Point the domain from Squarespace

In Squarespace: Domains > iamevandrake.com > DNS Settings. Remove any Squarespace default records for `@` and `www`, then add:

| Type  | Host | Value                   |
|-------|------|-------------------------|
| A     | @    | 185.199.108.153         |
| A     | @    | 185.199.109.153         |
| A     | @    | 185.199.110.153         |
| A     | @    | 185.199.111.153         |
| CNAME | www  | iamevandrake.github.io  |

DNS can take from a few minutes to a day. Once GitHub shows the domain check as passed, tick "Enforce HTTPS" on the Pages settings screen.
